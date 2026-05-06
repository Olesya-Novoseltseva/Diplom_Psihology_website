import type { SurveyAttemptRecord } from "../entities/survey.types.js";

export type NewSurveyAttempt = {
  userId: string;
  surveyKey: string;
  answers: number[];
  score: number;
};

export interface ISurveyAttemptRepository {
  create(row: NewSurveyAttempt): Promise<SurveyAttemptRecord>;
  listByUserAndKey(userId: string, surveyKey: string, limit: number): Promise<SurveyAttemptRecord[]>;
}
