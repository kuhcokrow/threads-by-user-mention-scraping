import { MentionPost } from "../domain/mention-post.entity";
import { MentionPostRepository } from "../repository/mention-post.repository.interface";
import { ProxyPoolService } from "../scraper/proxy-pool.service";
import { ScraperService } from "../scraper/scraper.service";
import { ScrapeBlockedError } from "../shared/errors";

export class MentionUsecase {
  constructor(
    private readonly mentionRepo: MentionPostRepository,
    private readonly scraper: ScraperService,
    private readonly proxyPool: ProxyPoolService
  ) {}

  /** Dipanggil oleh queue worker, bukan langsung dari HTTP handler (biar tidak blocking request) */
  async runScrapeJob(keyword: string): Promise<{ postsFound: number; proxyId: string }> {
    const { proxyId, config } = await this.proxyPool.acquire();

    try {
      const posts = await this.scraper.scrapeMentions(keyword, config);
      await this.mentionRepo.upsertMany(posts);
      await this.proxyPool.reportSuccess(proxyId);
      return { postsFound: posts.length, proxyId };
    } catch (err) {
      // ScrapeBlockedError maupun error teknis lain sama-sama menandai proxy gagal,
      // supaya proxy yang bermasalah masuk cooldown dan tidak dipakai job berikutnya.
      const cooldown = err instanceof ScrapeBlockedError ? 30 : 10;
      await this.proxyPool.reportFailure(proxyId, cooldown);
      throw err;
    }
  }

  async getMentions(keyword: string, page: number, pageSize: number): Promise<{ data: MentionPost[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      this.mentionRepo.findByKeyword(keyword, pageSize, offset),
      this.mentionRepo.countByKeyword(keyword),
    ]);
    return { data, total };
  }
}
