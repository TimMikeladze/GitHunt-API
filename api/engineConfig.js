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
        query Feed($type: FeedType!, $offset: Int) {
          feed(type: $type, offset: $offset, limit: $limit) {
            __typename
            ...FeedEntry
          }
        }
        fragment FeedEntry on Entry {
          __typename
          id
          commentCount
          repository {
            __typename
            full_name
            html_url
            owner {
              __typename
              avatar_url
            }
          }
          ...VoteButtons
          ...RepoInfo
        }
        fragment VoteButtons on Entry {
          __typename
          score
          vote {
            __typename
            vote_value
          }
        }
        fragement RepoInfo on Entry {
          __typename
          createdAt
          repository {
            __typename
            description
            stargazers_count
            open_issues_count
          }
          postedBy {
            __typename
            html_url
            login
          }
        }
      `,
      caches: [
        {
          ttl: 60000,
          store: 'standardCache',
        },
      ],
    },
  ],
};
