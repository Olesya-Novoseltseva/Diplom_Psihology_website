import type { SurveyDefinition } from "./survey.types.js";
import { GAD7_SURVEY } from "./gad7Survey.js";
import { NotFoundError } from "../../domain/errors/HttpError.js";
import { PHQ9_SURVEY } from "./phq9Survey.js";
import { PSS10_SURVEY } from "./pss10Survey.js";

/** Порядок в каталоге: универсально известные шкалы → самонаблюдение стресса. */
const all = [PHQ9_SURVEY, GAD7_SURVEY, PSS10_SURVEY] as const;
const byKey = new Map<string, SurveyDefinition>(all.map((s) => [s.key, s]));

export function listSurveyCatalog() {
  return all.map((s) => ({
    key: s.key,
    title: s.title,
    description: s.description,
    questionCount: s.questions.length,
  }));
}

export function getSurveyDefinition(key: string): SurveyDefinition {
  const s = byKey.get(key);
  if (!s) throw new NotFoundError("Опросник не найден");
  return s;
}
