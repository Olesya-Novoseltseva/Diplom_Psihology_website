import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(4000),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(32, "JWT_SECRET должен быть не короче 32 символов"),
    CORS_ORIGIN: z.string().url().default("http://localhost:5173"),
    /** true / 1 — reflect `Origin` header (tunnel demo URLs like *.trycloudflare.com). Keeps credentials + dynamic origin. */
    CORS_REFLECT_REQUEST_ORIGIN: z.string().optional(),

    SENTIMENT_PROVIDER: z.enum(["heuristic", "openai"]).default("heuristic"),
    SENTIMENT_OPENAI_BASE_URL: z.string().url().optional(),
    SENTIMENT_OPENAI_API_KEY: z.string().optional(),
    SENTIMENT_OPENAI_MODEL: z.string().optional(),
    /** true/1 — добавить response_format json_object в chat/completions (vLLM / OpenAI-совместимые серверы с поддержкой). */
    SENTIMENT_OPENAI_JSON_MODE: z.string().optional(),

    /** При problemLevel >= порога рекомендуем психолога (наряду с флагом модели и кризисными фразами). */
    JOURNAL_PSYCHOLOGIST_LEVEL: z.coerce.number().min(0).max(1).default(0.72),
    /** Порог для «серии дистресса» по последним записям. */
    JOURNAL_DISTRESS_STREAK_LEVEL: z.coerce.number().min(0).max(1).default(0.58),
    JOURNAL_SENTIMENT_STREAK_THRESHOLD: z.coerce.number().min(-1).max(1).default(-0.6),
    JOURNAL_SENTIMENT_STREAK_LEN: z.coerce.number().int().min(2).max(10).default(3),
    JOURNAL_DISTRESS_STREAK_LEN: z.coerce.number().int().min(2).max(10).default(3),

    ANXIETY_HELP_LEVEL: z.coerce.number().min(0).max(100).default(70),
    ANXIETY_URGENT_LEVEL: z.coerce.number().min(0).max(100).default(85),
    DEPRESSION_HELP_LEVEL: z.coerce.number().min(0).max(100).default(65),
    DEPRESSION_URGENT_LEVEL: z.coerce.number().min(0).max(100).default(80),

    ADMIN_EMAIL: z.string().email().optional(),
    ADMIN_PASSWORD: z.string().min(8).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.SENTIMENT_PROVIDER === "openai") {
      if (!data.SENTIMENT_OPENAI_BASE_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Для SENTIMENT_PROVIDER=openai задайте SENTIMENT_OPENAI_BASE_URL",
          path: ["SENTIMENT_OPENAI_BASE_URL"],
        });
      }
      if (!data.SENTIMENT_OPENAI_MODEL?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Для SENTIMENT_PROVIDER=openai задайте SENTIMENT_OPENAI_MODEL",
          path: ["SENTIMENT_OPENAI_MODEL"],
        });
      }
    }
  });

export type AppEnv = z.infer<typeof envSchema>;

/** Включает `response_format: { type: "json_object" }` для дневника (удобно для vLLM + Instruct). */
export function sentimentOpenAiJsonModeEnabled(env: AppEnv): boolean {
  const v = env.SENTIMENT_OPENAI_JSON_MODE?.trim().toLowerCase();
  return v === "true" || v === "1";
}

/** Cross-origin previews through reverse tunnels (Cloudflare/ngrok URLs change every run unless named). */
export function corsReflectRequestOrigin(env: AppEnv): boolean {
  const v = env.CORS_REFLECT_REQUEST_ORIGIN?.trim().toLowerCase();
  return v === "true" || v === "1";
}

export function loadEnv(): AppEnv {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Некорректные переменные окружения: ${issues}`);
  }
  return parsed.data;
}
