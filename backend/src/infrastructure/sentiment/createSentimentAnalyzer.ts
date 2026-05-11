import type { ISentimentAnalyzer } from "../../domain/services/ISentimentAnalyzer.js";
import { sentimentOpenAiJsonModeEnabled, type AppEnv } from "../../config/env.js";
import { HeuristicSentimentAnalyzer } from "./HeuristicSentimentAnalyzer.js";
import { OpenAiCompatibleJournalAnalyzer } from "./OpenAiCompatibleJournalAnalyzer.js";

export function createSentimentAnalyzer(env: AppEnv): ISentimentAnalyzer {
  switch (env.SENTIMENT_PROVIDER) {
    case "heuristic":
      return new HeuristicSentimentAnalyzer();
    case "openai": {
      const base = env.SENTIMENT_OPENAI_BASE_URL;
      const model = env.SENTIMENT_OPENAI_MODEL?.trim();
      if (!base || !model) {
        throw new Error("Для SENTIMENT_PROVIDER=openai задайте SENTIMENT_OPENAI_BASE_URL и SENTIMENT_OPENAI_MODEL");
      }
      return new OpenAiCompatibleJournalAnalyzer(
        base,
        model,
        env.SENTIMENT_OPENAI_API_KEY,
        sentimentOpenAiJsonModeEnabled(env),
      );
    }
    default:
      throw new Error(`Неизвестный SENTIMENT_PROVIDER: ${String((env as AppEnv).SENTIMENT_PROVIDER)}`);
  }
}
