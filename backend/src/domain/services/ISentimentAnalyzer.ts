import type { JournalAnalysisResult } from "../journal/JournalAnalysisResult.js";

export type { JournalAnalysisResult, SentimentLabel } from "../journal/JournalAnalysisResult.js";

export type JournalAnalysisInput = {
  text: string;
  wellbeing?: {
    anxietyLevel: number;
    depressionLevel: number;
    activityLevel: number;
    satisfactionLevel: number;
    latestSurveys: Array<{ key: string; title: string; score: number; maxScore: number; severity: string; createdAt: string }>;
    helpRecommended: boolean;
    urgentRecommended: boolean;
  };
};

export interface ISentimentAnalyzer {
  analyze(input: string | JournalAnalysisInput): Promise<JournalAnalysisResult>;
}
