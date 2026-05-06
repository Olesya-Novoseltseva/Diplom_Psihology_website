import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { ILogger } from "../../../infrastructure/logging/ILogger.js";

/**
 * Присваивает запросу идентификатор (заголовок + locals), по завершении ответа пишет метрики в лог.
 * Упрощает поиск пары «запрос → падение» в error handler.
 */
export function createRequestLogger(logger: ILogger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const reqId = randomUUID();
    const started = Date.now();
    res.locals.requestId = reqId;
    res.setHeader("X-Request-Id", reqId);

    res.on("finish", () => {
      logger.info("http_response", {
        reqId,
        method: req.method,
        path: req.originalUrl.split("?")[0],
        status: res.statusCode,
        ms: Date.now() - started,
      });
    });

    next();
  };
}
