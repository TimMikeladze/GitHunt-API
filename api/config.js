export default {
  // If set to to true, GitHunt will use `extractgql` in order to
  // map query ids received from the client to GraphQL documents.
  //
  // Note that the same option must be enabled on the client
  // and the extracted_queries.json file in both the client and API server
  // must be the same.
  persistedQueries: false,
};
