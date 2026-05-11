import type { ISentimentAnalyzer, JournalAnalysisInput } from "../../domain/services/ISentimentAnalyzer.js";
import {
  buildJournalUserPrompt,
  journalAnalysisFromLlmRawText,
  JOURNAL_LLM_SYSTEM_RU,
} from "./llmJournalAnalysis.js";

type ChatCompletionResponse = {
  choices?: { message?: { content?: string | null } }[];
  error?: { message?: string };
};

const LLM_FETCH_TIMEOUT_MS = 180_000;

function describeFetchError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const bits: string[] = [err.message];
  const c = err.cause;
  if (c instanceof Error) bits.push(c.message);
  else if (c != null && typeof c === "object" && "code" in c) bits.push(String((c as { code: unknown }).code));
  return bits.filter(Boolean).join("; ");
}

/**
 * OpenAI-совместимый /v1/chat/completions (vLLM, LM Studio и др.).
 * baseUrl — с суффиксом /v1, например http://127.0.0.1:8000/v1
 */
export class OpenAiCompatibleJournalAnalyzer implements ISentimentAnalyzer {
  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly apiKey?: string,
    private readonly jsonMode = false,
  ) {}

  async analyze(input: string | JournalAnalysisInput) {
    const text = typeof input === "string" ? input : input.text;
    const wellbeing = typeof input === "string" ? undefined : input.wellbeing;
    const url = `${this.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;

    const body: Record<string, unknown> = {
      model: this.model,
      messages: [
        { role: "system", content: JOURNAL_LLM_SYSTEM_RU },
        { role: "user", content: buildJournalUserPrompt(text, wellbeing) },
      ],
      temperature: 0.2,
      max_tokens: 450,
    };
    if (this.jsonMode) {
      body.response_format = { type: "json_object" };
    }

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(LLM_FETCH_TIMEOUT_MS),
      });
    } catch (e) {
      throw new Error(
        `LLM API: сетевой сбой к ${url} (${describeFetchError(e)}). ` +
          `Проверьте SENTIMENT_OPENAI_BASE_URL (предпочтительно http://127.0.0.1:ПОРТ/v1 и тот же порт, что в docker compose), ` +
          `что контейнер vLLM уже полностью поднялся (в логах — готовность к запросам), и что не блокирует файрвол.`,
      );
    }
    const responseText = await res.text();
    let raw: ChatCompletionResponse;
    try {
      raw = JSON.parse(responseText) as ChatCompletionResponse;
    } catch {
      throw new Error(
        `LLM API: ответ не JSON (${res.status}): ${responseText.slice(0, 400)}${responseText.length > 400 ? "…" : ""}`,
      );
    }
    if (!res.ok) {
      const msg = raw.error?.message ?? responseText.slice(0, 300);
      throw new Error(`LLM API: ${res.status} ${msg}`);
    }
    const content = raw.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("LLM API: пустой ответ модели");
    }
    return journalAnalysisFromLlmRawText(content);
  }
}
