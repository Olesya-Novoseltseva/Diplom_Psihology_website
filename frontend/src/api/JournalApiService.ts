import type { ApiClient } from "./ApiClient.js";

export type JournalEntryDto = {
  id: string;
  content: string;
  sentimentScore: number;
  sentimentLabel: string;
  primaryEmotion: string;
  primaryIntensity: number;
  emotionProfile: Record<string, number>;
  problemLevel: number;
  suggestPsychologist: boolean;
  adviceFromModel: string | null;
  createdAt: string;
};

export type CreateJournalResponse = {
  entry: JournalEntryDto;
  negativeStreak: boolean;
  distressStreak: boolean;
  psychologistSuggested: boolean;
  assistantMessage: string;
};

export class JournalApiService {
  constructor(private readonly http: ApiClient) {}

  create(content: string): Promise<CreateJournalResponse> {
    return this.http.postJson<CreateJournalResponse>("/api/journal", { content });
  }

  list(limit = 30): Promise<{ entries: JournalEntryDto[] }> {
    const q = limit ? `?limit=${limit}` : "";
    return this.http.getJson<{ entries: JournalEntryDto[] }>(`/api/journal${q}`);
  }
}
