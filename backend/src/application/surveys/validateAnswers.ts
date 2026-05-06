import { BadRequestError } from "../../domain/errors/HttpError.js";
import type { SurveyDefinition } from "./survey.types.js";

export function assertValidAnswers(def: SurveyDefinition, answers: number[]): void {
  if (answers.length !== def.questions.length) {
    throw new BadRequestError("Число ответов не совпадает с опросником");
  }
  for (let i = 0; i < answers.length; i++) {
    const raw = answers[i];
    const q = def.questions[i];
    if (!Number.isFinite(raw) || Math.floor(raw) !== raw) {
      throw new BadRequestError(`Ответ ${i + 1} должен быть целым числом`);
    }
    if (raw < q.min || raw > q.max) {
      throw new BadRequestError(`Ответ ${i + 1} вне допустимого диапазона`);
    }
  }
}
