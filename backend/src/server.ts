import { createApplicationContext, type ApplicationContext } from "./composition/bootstrap.js";

let ctx: ApplicationContext;
try {
  ctx = createApplicationContext();
} catch (e) {
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "FATAL",
      scope: "api",
      event: "bootstrap_failed",
      meta:
        e instanceof Error
          ? { errMessage: e.message, errStack: e.stack, errName: e.name }
          : { errDetail: String(e) },
    }),
  );
  process.exit(1);
}

const { logger, env, app, close } = ctx;

process.on("unhandledRejection", (reason) => {
  const err = reason instanceof Error ? reason : new Error(typeof reason === "string" ? reason : JSON.stringify(reason));
  logger.error("unhandled_rejection", err);
});

process.on("uncaughtException", (error) => {
  logger.error("uncaught_exception", error);
  process.exit(1);
});

const server = app.listen(env.PORT, () => {
  logger.info("http_listen", { port: env.PORT, corsOrigin: env.CORS_ORIGIN });
});

async function shutdown(signal: string) {
  logger.info("shutdown_started", { signal });
  server.close((closeErr) => {
    if (closeErr) {
      logger.warn("http_server_close_warning", { errMessage: closeErr.message });
    }
    void close()
      .then(() => {
        logger.info("shutdown_complete", {});
        process.exit(0);
      })
      .catch((e) => {
        logger.error("shutdown_cleanup_failed", e);
        process.exit(1);
      });
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
