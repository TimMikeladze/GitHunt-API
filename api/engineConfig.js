export default {
  stores: [
    {
      name: 'standardCache',
      epoch: 1,
      timeout: '1s',
    },
  ],
  operations: [
    {
      signature: `
        query CurrentUserForLayout {
          currentUser {
            __typename
            avatar_url
            login
          }
        }
      `,
      caches: [
        {
          ttl: 300000,
          store: 'standardCache',
        },
      ],
    },
  ],
};
