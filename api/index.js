import express from 'express';
import { apolloExpress, graphiqlExpress } from 'apollo-server';
import { makeExecutableSchema } from 'graphql-tools';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import knex from './sql/connector';
import { accountsExpress } from 'apollo-accounts-server';
import Accounts from 'apollo-accounts-knexjs';

import { schema, resolvers } from './schema';
import { GitHubConnector } from './github/connector';
import { Repositories, Users } from './github/models';
import { Entries, Comments } from './sql/models';

dotenv.config({ silent: true });
let PORT = 3010;

if (process.env.PORT) {
  PORT = parseInt(process.env.PORT, 10) + 100;
}

const {
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
} = process.env;

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static('dist'));

const executableSchema = makeExecutableSchema({
  typeDefs: schema,
  resolvers,
});

const accountsConfig = {
  server: {
    secret: 'terrible secret',
  },
  github: {
    key: GITHUB_CLIENT_ID,
    secret: GITHUB_CLIENT_SECRET,
  },
};

const accounts = new Accounts(accountsConfig, knex);

app.use(accountsExpress(accounts));

app.use('/graphql', apolloExpress((req) => {
  // Get the query, the same way express-graphql does it
  // https://github.com/graphql/express-graphql/blob/3fa6e68582d6d933d37fa9e841da5d2aa39261cd/src/index.js#L257
  const query = req.query.query || req.body.query;
  if (query && query.length > 2000) {
    // None of our app's queries are this long
    // Probably indicates someone trying to send an overly expensive query
    throw new Error('Query too large.');
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

  const gitHubConnector = new GitHubConnector({
    clientId: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
  });

  return {
    schema: executableSchema,
    context: {
      user,
      Repositories: new Repositories({ connector: gitHubConnector }),
      Users: new Users({ connector: gitHubConnector }),
      Entries: new Entries(),
      Comments: new Comments(),
    },
  };
}));

app.use('/graphiql', graphiqlExpress({
  endpointURL: '/graphql',
}));

app.listen(PORT, () => console.log( // eslint-disable-line no-console
  `API Server is now running on http://localhost:${PORT}`
));
