import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { MentionUsecase } from "../../usecase/mention.usecase";
import { scrapeQueue } from "../../queue/scrape.queue";
import { ValidationError } from "../../shared/errors";

const triggerScrapeSchema = z.object({
  keyword: z.string().min(1, "keyword wajib diisi"),
});

const listMentionsSchema = z.object({
  keyword: z.string().min(1),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export class MentionController {
  constructor(private readonly usecase: MentionUsecase) {}

  /** POST /mentions/scrape -- enqueue job, tidak scrape langsung di request (biar tidak blocking) */
  triggerScrape = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = triggerScrapeSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors[0]?.message);
      }

      const job = await scrapeQueue.add("scrape", { keyword: parsed.data.keyword });
      res.status(202).json({ message: "Job scraping dijadwalkan", jobId: job.id });
    } catch (err) {
      next(err);
    }
  };

  /** GET /mentions?keyword=...&page=...&pageSize=... */
  listMentions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = listMentionsSchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors[0]?.message);
      }

      const { keyword, page, pageSize } = parsed.data;
      const { data, total } = await this.usecase.getMentions(keyword, page, pageSize);

      res.json({
        data,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      });
    } catch (err) {
      next(err);
    }
  };
}
