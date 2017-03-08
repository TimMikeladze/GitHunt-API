let requestQueue = [];

export default function rp(requestOptions) {
  // Ensure we expected to get more requests
  expect(requestQueue.length).not.toBe(0);

  const nextRequest = requestQueue.shift();
  // Ensure this is the request we expected
  expect(requestOptions).toEqual(nextRequest.options);

  return new Promise((resolve, reject) => {
    if (nextRequest.result) {
      resolve(nextRequest.result);
    } else if (nextRequest.error) {
      reject(nextRequest.error);
    } else {
      throw new Error('Mocked request must have result or error.');
    }
  });
}

function pushMockRequest({ options, result, error }) {
  const defaultOptions = {
    json: true,
    headers: {
      'user-agent': 'GitHunt',
    },
    resolveWithFullResponse: true,
  };
  const { uri, ...rest } = options;

  const url = `https://api.github.com${uri}`;

  requestQueue.push({
    options: {
      ...defaultOptions,
      ...rest,
      uri: url,
    },
    result,
    error,
  });
}

function flushRequestQueue() {
  requestQueue = [];
}

function noRequestsLeft() {
  expect(requestQueue.length).toBe(0);
}

rp.__pushMockRequest = pushMockRequest; // eslint-disable-line no-underscore-dangle
rp.__flushRequestQueue = flushRequestQueue; // eslint-disable-line no-underscore-dangle
rp.__noRequestsLeft = noRequestsLeft; // eslint-disable-line no-underscore-dangle

rp.actual = require.requireActual('request-promise');
