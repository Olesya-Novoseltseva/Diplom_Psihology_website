export type SurveyAttemptRecord = {
  id: string;
  userId: string;
  surveyKey: string;
  answers: number[];
  score: number;
  createdAt: Date;
};

export type SurveyAttemptPublic = {
  id: string;
  surveyKey: string;
  score: number;
  createdAt: Date;
};
