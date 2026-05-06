import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../../../domain/errors/HttpError.js";
import type { ILogger } from "../../../infrastructure/logging/ILogger.js";

function isDatabaseUnreachable(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name === "PrismaClientInitializationError") return true;
  return err.message.includes("Can't reach database server") || err.message.includes("P1001");
}

export function createErrorHandler(logger: ILogger): ErrorRequestHandler {
  return (err, req, res, _next): void => {
    const reqId = res.locals.requestId as string | undefined;

    if (err instanceof ZodError) {
      logger.warn("validation_failed", {
        reqId,
        method: req.method,
        path: req.originalUrl.split("?")[0],
        issueCount: err.issues.length,
        paths: err.issues.map((i) => i.path.join(".") || "(root)"),
      });
      res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "Ошибка валидации",
        issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
      return;
    }

    if (err instanceof HttpError) {
      const meta = {
        reqId,
        method: req.method,
        path: req.originalUrl.split("?")[0],
        errorCode: err.code,
        status: err.statusCode,
        message: err.message,
      };
      if (err.statusCode >= 500) {
        logger.error("http_server_error", err, meta);
      } else {
        logger.warn("http_client_error", meta);
      }
      res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
      });
      return;
    }

    if (isDatabaseUnreachable(err)) {
      logger.error(
        "database_unreachable",
        err,
        {
          reqId,
          method: req.method,
          path: req.originalUrl.split("?")[0],
        },
      );
      res.status(503).json({
        code: "DATABASE_UNAVAILABLE",
        message:
          "База данных PostgreSQL недоступна. Запустите PostgreSQL (например: docker compose up -d из корня проекта) и выполните миграции: npm run db:migrate --workspace=backend",
      });
      return;
    }

    logger.error(
      "unhandled_exception",
      err,
      {
        reqId,
        method: req.method,
        path: req.originalUrl.split("?")[0],
      },
    );

    const message = err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    res.status(500).json({
      code: "INTERNAL",
      message,
    });
  };
}
