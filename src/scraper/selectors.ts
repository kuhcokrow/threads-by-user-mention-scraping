export const ThreadsSearch = {
  searchUrl: (keyword: string) =>
    `https://www.threads.com/search?q=${encodeURIComponent(keyword)}&serp_type=default&filter=recent`,
  // Response GraphQL search selalu lewat endpoint ini
  graphqlEndpointMatch: "/graphql/query",
  // Nama query resmi yang kita incar, buat memastikan response yang di-capture benar
  // (Threads bisa fire beberapa graphql query lain di halaman yang sama)
  friendlyNameMatch: "BarcelonaSearchResultsRefetchableQuery",
};