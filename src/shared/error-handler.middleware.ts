import { Request, Response, NextFunction } from "express";
import { AppError } from "./errors";

export function errorHandlerMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: "Terjadi kesalahan internal" });
}
