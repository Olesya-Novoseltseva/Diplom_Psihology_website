import type { JournalAnalysisResult } from "../journal/JournalAnalysisResult.js";

export type { JournalAnalysisResult, SentimentLabel } from "../journal/JournalAnalysisResult.js";

export interface ISentimentAnalyzer {
  analyze(text: string): Promise<JournalAnalysisResult>;
}
