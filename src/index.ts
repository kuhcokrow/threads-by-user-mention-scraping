import "dotenv/config";
import express from "express";
import pinoHttp from "pino-http";
import { mentionRouter } from "./delivery/http/mention.routes";
import { errorHandlerMiddleware } from "./shared/error-handler.middleware";

const app = express();

app.use(express.json());
app.use(pinoHttp());

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use(mentionRouter);

app.use(errorHandlerMiddleware);

const port = process.env.PORT ?? 3000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on port ${port}`);
});
