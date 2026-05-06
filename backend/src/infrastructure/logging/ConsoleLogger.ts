import type { ILogger, LogMeta } from "./ILogger.js";

function appendErrorPayload(target: LogMeta, err?: unknown): void {
  if (err === undefined) return;
  if (err instanceof Error) {
    target.errMessage = err.message;
    if (err.stack) target.errStack = err.stack;
    target.errName = err.name;
    return;
  }
  target.errDetail = String(err);
}

export class ConsoleLogger implements ILogger {
  constructor(
    private readonly scope: string,
    private readonly nodeEnv: string | undefined = process.env.NODE_ENV,
  ) {}

  info(event: string, meta?: LogMeta): void {
    this.write("INFO", event, meta);
  }

  warn(event: string, meta?: LogMeta): void {
    this.write("WARN", event, meta);
  }

  error(event: string, err?: unknown, meta?: LogMeta): void {
    const merged: LogMeta = { ...(meta ?? {}) };
    appendErrorPayload(merged, err);
    this.write("ERROR", event, merged);
  }

  private write(level: string, event: string, meta?: LogMeta): void {
    const line = {
      ts: new Date().toISOString(),
      level,
      scope: this.scope,
      env: this.nodeEnv ?? "unknown",
      event,
      ...(meta && Object.keys(meta).length > 0 ? { meta } : {}),
    };
    const serialized = JSON.stringify(line);
    if (level === "ERROR") {
      console.error(serialized);
      return;
    }
    if (level === "WARN") {
      console.warn(serialized);
      return;
    }
    console.log(serialized);
  }
}
