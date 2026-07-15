import "dotenv/config";
import { Worker } from "bullmq";
import pino from "pino";
import { redisConnection } from "../infrastructure/redis";
import { JsonMentionPostRepository } from "../repository/mention-post.repository.impl";
import { JsonProxyRepository } from "../repository/proxy.repository.impl";
import { ScraperService } from "../scraper/scraper.service";
import { ProxyPoolService } from "../scraper/proxy-pool.service";
import { MentionUsecase } from "../usecase/mention.usecase";
import { ScrapeJobData } from "./scrape.queue";

const logger = pino({ name: "scrape-worker" });

const mentionRepo = new JsonMentionPostRepository();
const proxyRepo = new JsonProxyRepository();
const scraper = new ScraperService();
const proxyPool = new ProxyPoolService(proxyRepo);
const mentionUsecase = new MentionUsecase(mentionRepo, scraper, proxyPool);

// concurrency rendah sengaja -- tiap job buka browser sendiri, jangan overload host
const worker = new Worker<ScrapeJobData, unknown, "scrape">(
  "scrape-mentions",
  async (job) => {
    logger.info({ keyword: job.data.keyword, jobId: job.id }, "mulai scrape job");
    const result = await mentionUsecase.runScrapeJob(job.data.keyword);
    logger.info({ ...result, jobId: job.id }, "scrape job selesai");
    return result;
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

worker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, keyword: job?.data.keyword, err: err.message }, "scrape job gagal");
});

logger.info("scrape worker jalan, menunggu job...");
