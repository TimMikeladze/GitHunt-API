import rp from 'request-promise';

import { GitHubConnector } from './connector';

describe('GitHub connector', () => {
  beforeEach(() => {
    rp.__flushRequestQueue();
  });

  afterEach(() => {
    rp.__noRequestsLeft();
  });

  it('can be constructed', () => {
    expect(new GitHubConnector()).toBeTruthy();
  });

  it('can load one endpoint', () => {
    const connector = new GitHubConnector();

    rp.__pushMockRequest({
      options: { uri: '/endpoint' },
      result: {
        headers: {},
        body: { id: 1 },
      },
    });

    return connector.get('/endpoint').then((result) => {
      expect(result).toEqual({ id: 1 });
    });
  });

  it('fetches each endpoint only once per instance', () => {
    const connector = new GitHubConnector();

    rp.__pushMockRequest({
      options: {
        uri: '/endpoint',
      },
      result: {
        headers: {},
        body: { id: 1 },
      },
    });

    return connector.get('/endpoint')
      .then((result) => {
        expect(result).toEqual({ id: 1 });
      })
      .then(() => (
        // This get call doesn't actually call the API - note that we only
        // enqueued the request mock once!
        connector.get('/endpoint')
      ))
      .then((result) => {
        expect(result).toEqual({ id: 1 });
      });
  });

  it('passes through the API token for unauthenticated requests', () => {
    const connector = new GitHubConnector({
      clientId: 'fake_client_id',
      clientSecret: 'fake_client_secret',
    });

    rp.__pushMockRequest({
      options: {
        uri: '/endpoint',
        qs: {
          client_id: 'fake_client_id',
          client_secret: 'fake_client_secret',
        },
      },
      result: {
        headers: {},
        body: {
          id: 1,
        },
      },
    });

    return connector.get('/endpoint').then((result) => {
      expect(result).toEqual({ id: 1 });
    });
  });

  it('should correctly interpret etags from Github', () => {
    const connector = new GitHubConnector();
    const etag = 'etag';

    rp.__pushMockRequest({
      options: {
        uri: '/endpoint',
      },
      result: {
        headers: {
          etag,
        },
        body: {
          id: 1,
        },
      },
    });

    const connector2 = new GitHubConnector();

    rp.__pushMockRequest({
      options: {
        uri: '/endpoint',
        headers: {
          'If-None-Match': etag,
          'user-agent': 'GitHunt',
        },
      },
      result: {
        headers: {},
        body: {
          id: 1,
        },
      },
    });

    return connector.get('/endpoint')
      .then(() => connector2.get('/endpoint'))
      .then((result) => {
        expect(result).toEqual({ id: 1 });
      });
  });
});
