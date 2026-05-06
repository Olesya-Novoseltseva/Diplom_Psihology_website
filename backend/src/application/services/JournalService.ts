import type { IJournalRepository } from "../../domain/repositories/IJournalRepository.js";
import type { ISentimentAnalyzer } from "../../domain/services/ISentimentAnalyzer.js";
import type { JournalEntryPublic } from "../../domain/entities/journal.types.js";
import type { JournalPolicy } from "../../config/journalPolicy.js";
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
  ) {}

  async addEntry(userId: string, content: string) {
    const analysis = await this.sentiment.analyze(content);
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
    };
  }

  async list(userId: string, limit: number): Promise<JournalEntryPublic[]> {
    const rows = await this.journal.listByUser(userId, limit);
    return rows.map(toPublic);
  }
}
