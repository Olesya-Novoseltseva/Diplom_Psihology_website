/**
 * Абстракция логирования (DIP): HTTP-слой и точка входа зависят от интерфейса,
 * а не от конкретной записи в stdout / файлов / внешних систем.
 */
export type LogMeta = Record<string, unknown>;

export interface ILogger {
  info(event: string, meta?: LogMeta): void;
  warn(event: string, meta?: LogMeta): void;
  /** Событие ошибки: необязательный экземпляр Error даёт message/stack в метаданных. */
  error(event: string, err?: unknown, meta?: LogMeta): void;
}
