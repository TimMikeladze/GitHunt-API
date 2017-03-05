import { run } from '../api/server';
import rp from 'request-promise';

const testPort = 6789;
const endpointUrl = `http://localhost:${testPort}/graphql`;

let server;
beforeAll(() => {
  server = run({ PORT: testPort });
});

it('accepts a query', async () => {
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
  return rp(endpointUrl, {
    method: 'post',
    body: { query, variables },
    json: true,
  });
}
