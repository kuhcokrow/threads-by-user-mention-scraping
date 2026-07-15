import path from "path";
import { randomUUID } from "crypto";
import { CreateMentionPostInput, MentionPost } from "../domain/mention-post.entity";
import { MentionPostRepository } from "./mention-post.repository.interface";
import { readJsonFile, writeJsonFile } from "../infrastructure/json-store";

const FILE_PATH = path.join(process.cwd(), "data", "mentions.json");

export class JsonMentionPostRepository implements MentionPostRepository {
  private async load(): Promise<MentionPost[]> {
    return readJsonFile<MentionPost[]>(FILE_PATH, []);
  }

  async upsertMany(posts: CreateMentionPostInput[]): Promise<number> {
    const existing = await this.load();
    const existingIds = new Set(existing.map((p) => p.postId));

    let insertedCount = 0;
    for (const post of posts) {
      if (existingIds.has(post.postId)) continue; // dedup by postId
      existing.push({
        id: randomUUID(),
        postId: post.postId,
        keyword: post.keyword,
        authorHandle: post.authorHandle,
        content: post.content,
        postUrl: post.postUrl,
        postedAt: post.postedAt ?? null,
        scrapedAt: new Date(),
      });
      existingIds.add(post.postId);
      insertedCount += 1;
    }

    if (insertedCount > 0) {
      await writeJsonFile(FILE_PATH, existing);
    }
    return insertedCount;
  }

  async findByKeyword(keyword: string, limit: number, offset: number): Promise<MentionPost[]> {
    const all = await this.load();
    return all
      .filter((p) => p.keyword === keyword)
      .sort((a, b) => new Date(b.scrapedAt ?? 0).getTime() - new Date(a.scrapedAt ?? 0).getTime())
      .slice(offset, offset + limit);
  }

  async countByKeyword(keyword: string): Promise<number> {
    const all = await this.load();
    return all.filter((p) => p.keyword === keyword).length;
  }
}
