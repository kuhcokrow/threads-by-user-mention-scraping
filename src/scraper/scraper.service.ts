import { chromium, Browser } from "playwright";
import { CreateMentionPostInput } from "../domain/mention-post.entity";
import { ProxyConnectionConfig } from "../domain/proxy-identity.entity";
import { ThreadsSelectors } from "./selectors";
import { ScrapeBlockedError } from "../shared/errors";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
];

export class ScraperService {
  /**
   * Scrape halaman search Threads untuk satu keyword, pakai satu proxy identity.
   * Melempar ScrapeBlockedError kalau terdeteksi captcha/block, supaya
   * job processor bisa menandai proxy ini gagal dan retry dengan proxy lain.
   */
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
      });

      const page = await context.newPage();
      await page.goto(ThreadsSelectors.searchUrl(keyword), { waitUntil: "domcontentloaded", timeout: 30_000 });

      // Deteksi block/captcha sebelum lanjut parsing
      const isBlocked = await page.locator(ThreadsSelectors.captchaIndicator).count();
      if (isBlocked > 0) {
        throw new ScrapeBlockedError();
      }

      // Scroll beberapa kali supaya lazy-loaded content ikut termuat
      for (let i = 0; i < 3; i++) {
        await page.mouse.wheel(0, 2000);
        await page.waitForTimeout(1000 + Math.random() * 1000);
      }

      const containers = await page.locator(ThreadsSelectors.postContainer).all();
      const results: CreateMentionPostInput[] = [];

      for (const el of containers) {
        try {
          const authorHandle = (await el.locator(ThreadsSelectors.postAuthorHandle).first().textContent())?.trim();
          const content = (await el.locator(ThreadsSelectors.postContent).first().textContent())?.trim();
          const permalink = await el.locator(ThreadsSelectors.postPermalink).first().getAttribute("href");

          if (!authorHandle || !content || !permalink) continue;

          const postId = permalink.split("/post/")[1]?.split(/[/?]/)[0];
          if (!postId) continue;

          results.push({
            postId,
            keyword,
            authorHandle,
            content,
            postUrl: `https://www.threads.net${permalink}`,
            postedAt: null, // isi kalau selector timestamp sudah dipastikan formatnya
          });
        } catch {
          // satu post gagal di-parse tidak boleh menggagalkan seluruh batch
          continue;
        }
      }

      return results;
    } finally {
      if (browser) await browser.close();
    }
  }
}
