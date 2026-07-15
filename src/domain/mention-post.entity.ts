/**
 * Entity murni untuk hasil mention di Threads.
 * Tidak bergantung pada Prisma atau library apapun.
 */
export interface MentionPost {
  id?: string;
  postId: string;
  keyword: string;
  authorHandle: string;
  content: string;
  postUrl: string;
  postedAt?: Date | null;
  scrapedAt?: Date;
}

export interface CreateMentionPostInput {
  postId: string;
  keyword: string;
  authorHandle: string;
  content: string;
  postUrl: string;
  postedAt?: Date | null;
}
