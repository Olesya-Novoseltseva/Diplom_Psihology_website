import type { AppEnv } from "./env.js";

export type JournalPolicy = {
  psychologistProblemLevel: number;
  distressStreakLevel: number;
  sentimentStreakThreshold: number;
  sentimentStreakLen: number;
  distressStreakLen: number;
};

export function journalPolicyFromEnv(env: AppEnv): JournalPolicy {
  return {
    psychologistProblemLevel: env.JOURNAL_PSYCHOLOGIST_LEVEL,
    distressStreakLevel: env.JOURNAL_DISTRESS_STREAK_LEVEL,
    sentimentStreakThreshold: env.JOURNAL_SENTIMENT_STREAK_THRESHOLD,
    sentimentStreakLen: env.JOURNAL_SENTIMENT_STREAK_LEN,
    distressStreakLen: env.JOURNAL_DISTRESS_STREAK_LEN,
  };
}
