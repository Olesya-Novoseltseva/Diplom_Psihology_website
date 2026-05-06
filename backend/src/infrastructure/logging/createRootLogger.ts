import { ConsoleLogger } from "./ConsoleLogger.js";
import type { ILogger } from "./ILogger.js";

/** Единая точка создания корневого логгера процесса API. */
export function createRootLogger(): ILogger {
  return new ConsoleLogger("api");
}
