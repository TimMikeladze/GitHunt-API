import rp from 'request-promise';
import casual from 'casual';

import { run } from '../api/server';

const testPort = 6789;
const endpointUrl = `http://localhost:${testPort}/graphql`;

let server;
beforeAll(() => {
  server = run({ PORT: testPort });
});

it('accepts a query', async () => {
  casual.seed(123);

  [
    ['apollographql/apollo-client', 'stubailo'],
    ['apollographql/graphql-server', 'helfer'],
    ['meteor/meteor', 'tmeasday'],
    ['twbs/bootstrap', 'Slava'],
    ['d3/d3', 'Slava'],
  ].forEach(([full_name, postedBy]) => {
    // First, it will request the repository;
    rp.__pushMockRequest({
      options: {
        uri: `/repos/${full_name}`,
      },
      result: {
        headers: {
          etag: casual.string,
        },
        body: {
          name: full_name.split('/')[1],
          full_name,
          description: casual.sentence,
          html_url: casual.url,
          stargazers_count: casual.integer(0),
          open_issues_count: casual.integer(0),
          owner: {
            login: full_name.split('/')[0],
            avatar_url: casual.url,
            html_url: casual.url,
          },
        },
      },
    });

    // Then the user who posted it
    rp.__pushMockRequest({
      options: {
        uri: `/users/${postedBy}`,
      },
      result: {
        headers: {
          etag: casual.string,
        },
        body: {
          login: postedBy,
        },
      },
    });
  });

  const result = await fetchGraphQL(`
    {
      feed (type: NEW, limit: 5) {
        repository {
          owner { login }
          name
        }

        postedBy { login }
      }
    }
  `);

  expect(result).toMatchSnapshot();
});

afterAll(() => {
  server.close();
  server = null;
});

function fetchGraphQL(query, variables) {
  return rp.actual(endpointUrl, {
    method: 'post',
    body: { query, variables },
    json: true,
  });
}
