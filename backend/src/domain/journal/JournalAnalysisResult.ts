import type { PrimaryEmotion } from "./emotions.js";

export type SentimentLabel = "positive" | "negative" | "neutral";

export type EmotionProfile = Partial<Record<PrimaryEmotion, number>>;

export type JournalAnalysisResult = {
  score: number;
  label: SentimentLabel;
  primaryEmotion: PrimaryEmotion;
  /** Насколько выражена превалирующая эмоция, 0..1 */
  primaryIntensity: number;
  emotionProfile: EmotionProfile;
  /** 0 — норма, 1 — сильный дистресс / высокая «проблемность» для интерфейса */
  problemLevel: number;
  /** Явная рекомендация модели обратиться к специалисту */
  suggestPsychologist: boolean;
  /** Короткий совет (от LLM или пусто — тогда шаблоны в приложении) */
  adviceFromModel: string;
};
