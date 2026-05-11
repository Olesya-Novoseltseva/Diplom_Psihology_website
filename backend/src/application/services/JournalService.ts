import type { IJournalRepository } from "../../domain/repositories/IJournalRepository.js";
import type { ISentimentAnalyzer } from "../../domain/services/ISentimentAnalyzer.js";
import type { JournalEntryPublic } from "../../domain/entities/journal.types.js";
import type { JournalPolicy } from "../../config/journalPolicy.js";
import type { WellbeingMetricsService, WellbeingSnapshot } from "./WellbeingMetricsService.js";
import { ServiceUnavailableError } from "../../domain/errors/HttpError.js";
import { isNegativeStreak } from "../rules/negativeStreak.js";
import { isDistressStreak } from "../rules/distressStreak.js";
import { buildJournalAssistantMessage } from "../rules/journalAssistant.js";
import { textMayIndicateCrisis } from "../safety/crisisLanguage.js";

function toPublic(e: {
  id: string;
  content: string;
  sentimentScore: number;
  sentimentLabel: string;
  primaryEmotion: JournalEntryPublic["primaryEmotion"];
  primaryIntensity: number;
  emotionProfile: JournalEntryPublic["emotionProfile"];
  problemLevel: number;
  suggestPsychologist: boolean;
  adviceFromModel: string | null;
  createdAt: Date;
}): JournalEntryPublic {
  return {
    id: e.id,
    content: e.content,
    sentimentScore: e.sentimentScore,
    sentimentLabel: e.sentimentLabel,
    primaryEmotion: e.primaryEmotion,
    primaryIntensity: e.primaryIntensity,
    emotionProfile: e.emotionProfile,
    problemLevel: e.problemLevel,
    suggestPsychologist: e.suggestPsychologist,
    adviceFromModel: e.adviceFromModel,
    createdAt: e.createdAt,
  };
}

export class JournalService {
  constructor(
    private readonly journal: IJournalRepository,
    private readonly sentiment: ISentimentAnalyzer,
    private readonly policy: JournalPolicy,
    private readonly wellbeing?: WellbeingMetricsService,
  ) {}

  async addEntry(userId: string, content: string) {
    const wellbeingSnapshot = await this.wellbeing?.current(userId);
    let analysis;
    try {
      analysis = await this.sentiment.analyze({ text: content, wellbeing: wellbeingSnapshot });
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      if (raw.startsWith("LLM API:")) {
        const detail = raw.replace(/\s+/g, " ").trim().slice(0, 400);
        throw new ServiceUnavailableError(
          "Не удалось выполнить анализ записи через нейросеть. Проверьте, что сервер (например vLLM) запущен, " +
            "в backend/.env совпадают SENTIMENT_OPENAI_BASE_URL и SENTIMENT_OPENAI_MODEL с /v1/models. " +
            `Технически: ${detail}`,
          "LLM_UNAVAILABLE",
        );
      }
      throw e;
    }
    const crisisLanguageDetected = textMayIndicateCrisis(content);
    const psychologistSuggested =
      crisisLanguageDetected ||
      analysis.suggestPsychologist ||
      analysis.problemLevel >= this.policy.psychologistProblemLevel;

    const saved = await this.journal.create({
      userId,
      content,
      sentimentScore: analysis.score,
      sentimentLabel: analysis.label,
      primaryEmotion: analysis.primaryEmotion,
      primaryIntensity: analysis.primaryIntensity,
      emotionProfile: analysis.emotionProfile,
      problemLevel: analysis.problemLevel,
      suggestPsychologist: psychologistSuggested,
      adviceFromModel: analysis.adviceFromModel || null,
    });

    const recent = await this.journal.listByUser(userId, Math.max(this.policy.sentimentStreakLen, this.policy.distressStreakLen));
    const negativeStreak = isNegativeStreak(
      recent.map((r) => r.sentimentScore),
      this.policy.sentimentStreakThreshold,
      this.policy.sentimentStreakLen,
    );
    const distressStreak = isDistressStreak(
      recent.map((r) => r.problemLevel),
      this.policy.distressStreakLevel,
      this.policy.distressStreakLen,
    );

    const assistantMessage = buildJournalAssistantMessage(analysis, {
      negativeStreak,
      distressStreak,
      psychologistSuggested,
      crisisLanguageDetected,
    });

    return {
      entry: toPublic(saved),
      negativeStreak,
      distressStreak,
      psychologistSuggested,
      assistantMessage,
      assistantAdvice: buildStructuredAdvice(assistantMessage, wellbeingSnapshot, psychologistSuggested),
      wellbeingSnapshot,
    };
  }

  async list(userId: string, limit: number): Promise<JournalEntryPublic[]> {
    const rows = await this.journal.listByUser(userId, limit);
    return rows.map(toPublic);
  }
}

function buildStructuredAdvice(message: string, wellbeing: WellbeingSnapshot | undefined, psychologistSuggested: boolean) {
  const parts = message.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const factors: string[] = [];
  if (wellbeing) {
    factors.push(`Тревожность: ${wellbeing.anxietyLevel}/100`);
    factors.push(`Депрессивность: ${wellbeing.depressionLevel}/100`);
    if (wellbeing.latestSurveys.length) {
      factors.push(`Учтены последние опросники: ${wellbeing.latestSurveys.map((s) => s.title).join(", ")}`);
    }
  }
  return {
    summary: parts[0] ?? "Запись сохранена и проанализирована.",
    factors,
    steps: parts.slice(1, psychologistSuggested ? 2 : 3),
    helpRecommendation: psychologistSuggested
      ? "По текущим признакам стоит обратиться к психологу вуза или другому очному специалисту."
      : null,
  };
}
