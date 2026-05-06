import type { ISentimentAnalyzer } from "../../domain/services/ISentimentAnalyzer.js";
import {
  buildJournalUserPrompt,
  journalAnalysisFromLlmRawText,
  JOURNAL_LLM_SYSTEM_RU,
} from "./llmJournalAnalysis.js";

type ChatCompletionResponse = {
  choices?: { message?: { content?: string | null } }[];
  error?: { message?: string };
};

/**
 * OpenAI-совместимый /v1/chat/completions (vLLM, LM Studio и др.).
 * baseUrl — с суффиксом /v1, например http://127.0.0.1:8000/v1
 */
export class OpenAiCompatibleJournalAnalyzer implements ISentimentAnalyzer {
  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly apiKey?: string,
  ) {}

  async analyze(text: string) {
    const url = `${this.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;

    const body = {
      model: this.model,
      messages: [
        { role: "system", content: JOURNAL_LLM_SYSTEM_RU },
        { role: "user", content: buildJournalUserPrompt(text) },
      ],
      temperature: 0.2,
      max_tokens: 450,
    };

    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    const raw = (await res.json()) as ChatCompletionResponse;
    if (!res.ok) {
      const msg = raw.error?.message ?? res.statusText;
      throw new Error(`LLM API: ${res.status} ${msg}`);
    }
    const content = raw.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("LLM API: пустой ответ модели");
    }
    return journalAnalysisFromLlmRawText(content);
  }
}
