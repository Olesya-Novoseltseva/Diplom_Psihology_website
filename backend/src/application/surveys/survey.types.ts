export type SurveyQuestion = {
  id: string;
  text: string;
  min: number;
  max: number;
};

export type SurveyDefinition = {
  key: string;
  title: string;
  description: string;
  questions: SurveyQuestion[];
  /** Подписи вариантов ответа для всей шкалы (индекс 0 = min). Удлиняет формулировки без дублирования в каждом вопросе. */
  sharedOptionLabels?: string[];
  /** Краткая справка по сумме баллов (пороги), для подписи под графиком. */
  scoreBandsHint?: string;
  score: (answers: number[]) => number;
  interpret: (scoreResult: number) => string;
};
