import type { ApiClient } from "./ApiClient.js";

export type WellbeingPointDto = {
  date: string;
  anxietyLevel: number;
  depressionLevel: number;
  activityLevel: number;
  satisfactionLevel: number;
  sourceCount: number;
};

export type WellbeingSnapshotDto = {
  anxietyLevel: number;
  depressionLevel: number;
  activityLevel: number;
  satisfactionLevel: number;
  latestSurveys: Array<{ key: string; title: string; score: number; maxScore: number; severity: string; createdAt: string }>;
  helpRecommended: boolean;
  urgentRecommended: boolean;
};

export class WellbeingApiService {
  constructor(private readonly http: ApiClient) {}

  current(): Promise<{ snapshot: WellbeingSnapshotDto }> {
    return this.http.getJson<{ snapshot: WellbeingSnapshotDto }>("/api/wellbeing/current");
  }

  daily(): Promise<{ points: WellbeingPointDto[] }> {
    return this.http.getJson<{ points: WellbeingPointDto[] }>("/api/wellbeing/daily");
  }

  monthly(): Promise<{ points: WellbeingPointDto[] }> {
    return this.http.getJson<{ points: WellbeingPointDto[] }>("/api/wellbeing/monthly");
  }
}
