import { Queue } from "bullmq";
import { redisConnection } from "../infrastructure/redis";

export interface ScrapeJobData {
  keyword: string;
}

export const scrapeQueue = new Queue<ScrapeJobData>("scrape-mentions", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});
