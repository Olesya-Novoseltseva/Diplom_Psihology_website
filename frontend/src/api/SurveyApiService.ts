import type { ApiClient } from "./ApiClient.js";

export type SurveyCatalogItem = {
  key: string;
  title: string;
  description: string;
  questionCount: number;
};

export type SurveyQuestionDto = {
  id: string;
  text: string;
  min: number;
  max: number;
};

export type SurveyDefinitionDto = {
  key: string;
  title: string;
  description: string;
  questions: SurveyQuestionDto[];
  sharedOptionLabels?: string[];
  scoreBandsHint?: string;
  scoreMin: number;
  scoreMax: number;
};

export type SurveyAttemptDto = {
  id: string;
  surveyKey: string;
  score: number;
  createdAt: string;
};

export class SurveyApiService {
  constructor(private readonly http: ApiClient) {}

  catalog(): Promise<{ surveys: SurveyCatalogItem[] }> {
    return this.http.getJson<{ surveys: SurveyCatalogItem[] }>("/api/surveys");
  }

  definition(key: string): Promise<SurveyDefinitionDto> {
    return this.http.getJson<SurveyDefinitionDto>(`/api/surveys/${encodeURIComponent(key)}`);
  }

  history(key: string): Promise<{ attempts: SurveyAttemptDto[] }> {
    return this.http.getJson<{ attempts: SurveyAttemptDto[] }>(
      `/api/surveys/${encodeURIComponent(key)}/attempts`,
    );
  }

  submit(key: string, answers: number[]): Promise<{ attempt: SurveyAttemptDto; interpretation: string }> {
    return this.http.postJson<{ attempt: SurveyAttemptDto; interpretation: string }>(
      `/api/surveys/${encodeURIComponent(key)}/attempts`,
      { answers },
    );
  }
}
