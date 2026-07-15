import { Router } from "express";
import { MentionController } from "./mention.controller";
import { MentionUsecase } from "../../usecase/mention.usecase";
import { JsonMentionPostRepository } from "../../repository/mention-post.repository.impl";
import { JsonProxyRepository } from "../../repository/proxy.repository.impl";
import { ScraperService } from "../../scraper/scraper.service";
import { ProxyPoolService } from "../../scraper/proxy-pool.service";

const mentionRepo = new JsonMentionPostRepository();
const proxyRepo = new JsonProxyRepository();
const scraper = new ScraperService();
const proxyPool = new ProxyPoolService(proxyRepo);
const usecase = new MentionUsecase(mentionRepo, scraper, proxyPool);
const controller = new MentionController(usecase);

export const mentionRouter = Router();

mentionRouter.post("/mentions/scrape", controller.triggerScrape);
mentionRouter.get("/mentions", controller.listMentions);
