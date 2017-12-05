import path from 'path';
import express from 'express';
import cookie from 'cookie';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';
import OpticsAgent from 'optics-agent';
import bodyParser from 'body-parser';
import { invert, isString } from 'lodash';
import { createServer } from 'http';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { execute, subscribe } from 'graphql';

import {
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
} from './githubKeys';

import { setUpGitHubLogin } from './githubLogin';
import { GitHubConnector } from './github/connector';
import { Repositories, Users } from './github/models';
import { Entries, Comments } from './sql/models';

import schema from './schema';
import queryMap from '../extracted_queries.json';
import config from './config';

import { Engine } from 'apollo-engine';

const WS_GQL_PATH = '/subscriptions';

// Arguments usually come from env vars
export function run({
                      OPTICS_API_KEY,
                      ENGINE_API_KEY,
                      PORT: portFromEnv = 3010,
                    } = {}) {
  if (OPTICS_API_KEY) {
    OpticsAgent.instrumentSchema(schema);
  }

  let port = portFromEnv;

  if (isString(portFromEnv)) {
    port = parseInt(portFromEnv, 10);
  }

  const wsGqlURL = process.env.NODE_ENV !== 'production'
  ? `ws://localhost:${port}${WS_GQL_PATH}`
  : `ws://api.githunt.com${WS_GQL_PATH}`;

  const app = express();

  if (ENGINE_API_KEY) {
    const engine = new Engine({ 
      engineConfig: {
        apiKey: ENGINE_API_KEY,
        stores: [
          {
            name: "embeddedCache",
            inMemory: {
              cacheSize: 10485760
            }
          }
        ],
        sessionAuth: {
          store: "embeddedCache",
          header: "Authorization"
        },
        queryCache: {
          publicFullQueryStore: "embeddedCache",
          privateFullQueryStore: "embeddedCache"
        },
        reporting: {
          endpointUrl: "https://engine-report.apollographql.com",
          debugReports: true
        },
        logging: {
          level: "DEBUG"
        }
      },
      graphqlPort: port
    });
    engine.start();
    app.use(engine.expressMiddleware());
  }
  app.use(cors());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  const invertedMap = invert(queryMap);

  app.use(
    '/graphql',
    (req, resp, next) => {
      if (config.persistedQueries) {
        // eslint-disable-next-line no-param-reassign
        req.body.query = invertedMap[req.body.id];
      }
      next();
    },
  );

  const sessionStore = setUpGitHubLogin(app);
  app.use(cookieParser(config.sessionStoreSecret));

  if (OPTICS_API_KEY) {
    app.use('/graphql', OpticsAgent.middleware());
  }

  app.use('/graphql', graphqlExpress((req) => {
    if (!config.persistedQueries) {
      // Get the query, the same way express-graphql does it
      // https://github.com/graphql/express-graphql/blob/3fa6e68582d6d933d37fa9e841da5d2aa39261cd/src/index.js#L257
      const query = req.query.query || req.body.query;
      if (query && query.length > 2000) {
        // None of our app's queries are this long
        // Probably indicates someone trying to send an overly expensive query
        throw new Error('Query too large.');
      }
    }

    let user;
    if (req.user) {
      // We get req.user from passport-github with some pretty oddly named fields,
      // let's convert that to the fields in our schema, which match the GitHub
      // API field names.
      user = {
        login: req.user.username,
        html_url: req.user.profileUrl,
        avatar_url: req.user.photos[0].value,
      };
    }

    // Initialize a new GitHub connector instance for every GraphQL request, so that API fetches
    // are deduplicated per-request only.
    const gitHubConnector = new GitHubConnector({
      clientId: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
    });

    let opticsContext;
    if (OPTICS_API_KEY) {
      opticsContext = OpticsAgent.context(req);
    }

    return {
      schema,
      tracing: true,
      cacheControl: true,
      context: {
        user,
        Repositories: new Repositories({ connector: gitHubConnector }),
        Users: new Users({ connector: gitHubConnector }),
        Entries: new Entries(),
        Comments: new Comments(),
        opticsContext,
      },
    };
  }));

  app.use('/graphiql', graphiqlExpress({
    endpointURL: '/graphql',
    subscriptionsEndpoint: wsGqlURL,
    query: `{
    feed (type: NEW, limit: 5) {
      repository {
        owner { login }
        name
      }

      postedBy { login }
    }
  }
  `,
  }));

  // Serve our helpful static landing page. Not used in production.
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });

  const server = createServer(app);

  server.listen(port, () => {
    console.log(`API Server is now running on http://localhost:${port}`); // eslint-disable-line no-console
    console.log(`API Server over web socket with subscriptions is now running on ws://localhost:${port}${WS_GQL_PATH}`); // eslint-disable-line no-console
  });

  // eslint-disable-next-line
  new SubscriptionServer(
    {
      schema,
      execute,
      subscribe,

      // the onOperation function is called for every new operation
      // and we use it to set the GraphQL context for this operation
      onOperation: (msg, params, socket) => {
        return new Promise((resolve) => {
          if (!config.persistedQueries) {
            // Get the query, the same way express-graphql does it
            // https://github.com/graphql/express-graphql/blob/3fa6e68582d6d933d37fa9e841da5d2aa39261cd/src/index.js#L257
            const query = params.query;
            if (query && query.length > 2000) {
              // None of our app's queries are this long
              // Probably indicates someone trying to send an overly expensive query
              throw new Error('Query too large.');
            }
          }

          const gitHubConnector = new GitHubConnector({
            clientId: GITHUB_CLIENT_ID,
            clientSecret: GITHUB_CLIENT_SECRET,
          });

          // Support for persistedQueries
          if (config.persistedQueries) {
            // eslint-disable-next-line no-param-reassign
            params.query = invertedMap[msg.payload.id];
          }

          let opticsContext;
          if (OPTICS_API_KEY) {
            opticsContext = OpticsAgent.context(socket.upgradeReq);
          }

          let wsSessionUser = null;
          if (socket.upgradeReq) {
            const cookies = cookie.parse(socket.upgradeReq.headers.cookie);
            const sessionID = cookieParser.signedCookie(cookies['connect.sid'], config.sessionStoreSecret);

            const baseContext = {
              context: {
                Repositories: new Repositories({ connector: gitHubConnector }),
                Users: new Users({ connector: gitHubConnector }),
                Entries: new Entries(),
                Comments: new Comments(),
                opticsContext,
              },
            };

            const paramsWithFulfilledBaseContext = Object.assign({}, params, baseContext);

            if (!sessionID) {
              resolve(paramsWithFulfilledBaseContext);

              return;
            }

            // get the session object
            sessionStore.get(sessionID, (err, session) => {
              if (err) {
                throw new Error('Failed retrieving sessionID from the sessionStore.');
              }

              if (session && session.passport && session.passport.user) {
                const sessionUser = session.passport.user;
                wsSessionUser = {
                  login: sessionUser.username,
                  html_url: sessionUser.profileUrl,
                  avatar_url: sessionUser.photos[0].value,
                };

                resolve(Object.assign(paramsWithFulfilledBaseContext, {
                  context: Object.assign(paramsWithFulfilledBaseContext.context, {
                    user: wsSessionUser,
                  }),
                }));
              }

              resolve(paramsWithFulfilledBaseContext);
            });
          }
        });
      },
    },
    {
      path: WS_GQL_PATH,
      server,
    },
  );

  return server;
}
