export interface ThreadsMentionFragment {
  fragment_type: string; // "plaintext" | "mention" | dll
  plaintext: string | null;
  mention_fragment: {
    mentioned_user: {
      username: string;
      id: string;
    };
  } | null;
}

export interface ThreadsPost {
  pk: string;
  code: string; // shortcode buat bangun permalink
  user: {
    username: string;
    id: string;
  };
  caption: {
    text: string;
  } | null;
  taken_at: number; // unix timestamp
  text_post_app_info: {
    text_fragments: {
      fragments: ThreadsMentionFragment[];
    } | null;
  } | null;
}

export interface ThreadsSearchGraphQLResponse {
  data: {
    searchResults: {
      edges: Array<{
        node: {
          thread: {
            thread_items: Array<{
              post: ThreadsPost;
            }>;
          };
        };
      }>;
    };
  };
}