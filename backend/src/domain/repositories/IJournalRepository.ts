import type { JournalEntryRecord } from "../entities/journal.types.js";
import type { EmotionProfile } from "../journal/JournalAnalysisResult.js";
import type { PrimaryEmotion } from "../journal/emotions.js";

export type NewJournalEntry = {
  userId: string;
  content: string;
  sentimentScore: number;
  sentimentLabel: string;
  primaryEmotion: PrimaryEmotion;
  primaryIntensity: number;
  emotionProfile: EmotionProfile;
  problemLevel: number;
  suggestPsychologist: boolean;
  adviceFromModel: string | null;
};

export interface IJournalRepository {
  create(row: NewJournalEntry): Promise<JournalEntryRecord>;
  listByUser(userId: string, limit: number): Promise<JournalEntryRecord[]>;
}
