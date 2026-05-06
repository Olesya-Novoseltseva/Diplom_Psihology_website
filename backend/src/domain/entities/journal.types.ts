import type { EmotionProfile } from "../journal/JournalAnalysisResult.js";
import type { PrimaryEmotion } from "../journal/emotions.js";

export type JournalEntryRecord = {
  id: string;
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
  createdAt: Date;
};

export type JournalEntryPublic = {
  id: string;
  content: string;
  sentimentScore: number;
  sentimentLabel: string;
  primaryEmotion: PrimaryEmotion;
  primaryIntensity: number;
  emotionProfile: EmotionProfile;
  problemLevel: number;
  suggestPsychologist: boolean;
  adviceFromModel: string | null;
  createdAt: Date;
};
