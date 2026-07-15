import { CreateMentionPostInput, MentionPost } from "../domain/mention-post.entity";

export interface MentionPostRepository {
  /** Insert kalau postId belum ada, skip kalau sudah ada (dedup) */
  upsertMany(posts: CreateMentionPostInput[]): Promise<number>;
  findByKeyword(keyword: string, limit: number, offset: number): Promise<MentionPost[]>;
  countByKeyword(keyword: string): Promise<number>;
}
