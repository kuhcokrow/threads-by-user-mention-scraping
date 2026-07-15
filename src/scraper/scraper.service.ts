import { chromium, Browser } from "playwright";
import { CreateMentionPostInput } from "../domain/mention-post.entity";
import { ProxyConnectionConfig } from "../domain/proxy-identity.entity";
import { ThreadsSearch } from "./selectors";
import { ThreadsPost, ThreadsSearchGraphQLResponse } from "./threads-response.types";
import { ScrapeBlockedError } from "../shared/errors";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
];

export class ScraperService {
  async scrapeMentions(keyword: string, proxy: ProxyConnectionConfig): Promise<CreateMentionPostInput[]> {
    let browser: Browser | null = null;
    try {
      browser = await chromium.launch({
        headless: true,
        proxy: {
          server: proxy.server,
          username: proxy.username,
          password: proxy.password,
        },
      });

      const context = await browser.newContext({
        userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
        viewport: { width: 1280, height: 800 },
        storageState: await this.loadSessionIfExists(),
      });

      const page = await context.newPage();

      const capturedResponses: ThreadsSearchGraphQLResponse[] = [];

      page.on("response", async (response) => {
        const url = response.url();
        if (!url.includes(ThreadsSearch.graphqlEndpointMatch)) return;

        try {
          const body = await response.text();
          if (!body.includes("searchResults")) return;

          const json = JSON.parse(body) as ThreadsSearchGraphQLResponse;
          if (json?.data?.searchResults?.edges) {
            capturedResponses.push(json);
          }
        } catch {
          // response bukan JSON valid atau bukan shape yang kita harapkan, skip
        }
      });

      await page.goto(ThreadsSearch.searchUrl(keyword), { waitUntil: "domcontentloaded", timeout: 30_000 });

      // networkidle sering tidak pernah tercapai di Threads (long-polling terus-menerus),
      // jadi kita tunggu manual dengan jeda lebih panjang + scroll bertahap
      for (let i = 0; i < 4; i++) {
        await page.mouse.wheel(0, 2000);
        await page.waitForTimeout(2000 + Math.random() * 1000);
      }

      if (capturedResponses.length === 0) {
        // Simpan screenshot & HTML buat debug -- cek apakah kena consent wall,
        // redirect app-install banner, atau captcha
        await page.screenshot({ path: `debug-${Date.now()}.png`, fullPage: true }).catch(() => {});
        const html = await page.content().catch(() => "");
        console.error("DEBUG page title:", await page.title().catch(() => "?"));
        console.error("DEBUG page url:", page.url());
        console.error("DEBUG html length:", html.length);
        throw new ScrapeBlockedError("Tidak ada response search graphql yang ter-capture");
      }

      return this.extractMentions(capturedResponses, keyword);
    } finally {
      if (browser) await browser.close();
    }
  }

  private async loadSessionIfExists(): Promise<string | undefined> {
    const fs = await import("fs/promises");
    const path = await import("path");
    const sessionPath = path.join(process.cwd(), "data", "session.json");
    try {
      await fs.access(sessionPath);
      return sessionPath;
    } catch {
      console.warn("Session belum ada -- scraping jalan tanpa login (anonim). Jalankan `pnpm build-session` dulu.");
      return undefined;
    }
  }

  private extractMentions(responses: ThreadsSearchGraphQLResponse[], keyword: string): CreateMentionPostInput[] {
    const results: CreateMentionPostInput[] = [];
    const seenPostIds = new Set<string>();
    const normalizedKeyword = keyword.replace(/^@/, "").toLowerCase();

    for (const response of responses) {
      for (const edge of response.data.searchResults.edges) {
        for (const item of edge.node.thread.thread_items) {
          const post = item.post;
          if (seenPostIds.has(post.pk)) continue;

          const fragments = post.text_post_app_info?.text_fragments?.fragments ?? [];
          const isRealMention = fragments.some(
            (f) =>
              f.fragment_type === "mention" &&
              f.mention_fragment?.mentioned_user.username.toLowerCase() === normalizedKeyword
          );

          if (!isRealMention) continue;

          seenPostIds.add(post.pk);
          results.push(this.toMentionInput(post, keyword));
        }
      }
    }

    return results;
  }

  private toMentionInput(post: ThreadsPost, keyword: string): CreateMentionPostInput {
    return {
      postId: post.pk,
      keyword,
      authorHandle: post.user.username,
      content: post.caption?.text ?? "",
      postUrl: `https://www.threads.com/@${post.user.username}/post/${post.code}`,
      postedAt: post.taken_at ? new Date(post.taken_at * 1000) : null,
    };
  }
}