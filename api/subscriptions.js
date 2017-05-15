import { PubSub, GraphQLExecutorWithSubscriptions } from 'graphql-subscriptions';

const pubsub = new PubSub();
const graphqlExecutor = new GraphQLExecutorWithSubscriptions({
  pubsub,
  setupFunctions: {
    commentAdded: (options, args) => ({
      commentAdded: comment => comment.repository_name === args.repoFullName,
    }),
  },
});

export { graphqlExecutor, pubsub };
