import type { ISurveyAttemptRepository } from "../../domain/repositories/ISurveyAttemptRepository.js";
import type { SurveyAttemptPublic } from "../../domain/entities/survey.types.js";
import type { SurveyDefinition } from "../surveys/survey.types.js";
import { getSurveyDefinition, listSurveyCatalog } from "../surveys/surveyRegistry.js";
import { assertValidAnswers } from "../surveys/validateAnswers.js";

function scoreBounds(def: SurveyDefinition) {
  const scoreMin = def.questions.reduce((s, q) => s + q.min, 0);
  const scoreMax = def.questions.reduce((s, q) => s + q.max, 0);
  return { scoreMin, scoreMax };
}

function toPublic(row: { id: string; surveyKey: string; score: number; createdAt: Date }): SurveyAttemptPublic {
  return {
    id: row.id,
    surveyKey: row.surveyKey,
    score: row.score,
    createdAt: row.createdAt,
  };
}

export class SurveyService {
  constructor(private readonly attempts: ISurveyAttemptRepository) {}

  catalog() {
    return listSurveyCatalog();
  }

  definition(key: string) {
    const s = getSurveyDefinition(key);
    const { scoreMin, scoreMax } = scoreBounds(s);
    return {
      key: s.key,
      title: s.title,
      description: s.description,
      questions: s.questions,
      sharedOptionLabels: s.sharedOptionLabels,
      scoreBandsHint: s.scoreBandsHint,
      scoreMin,
      scoreMax,
    };
  }

  async submit(userId: string, surveyKey: string, answers: number[]) {
    const def = getSurveyDefinition(surveyKey);
    assertValidAnswers(def, answers);
    const score = def.score(answers);
    const saved = await this.attempts.create({
      userId,
      surveyKey,
      answers,
      score,
    });
    return {
      attempt: toPublic(saved),
      interpretation: def.interpret(score),
    };
  }

  async history(userId: string, surveyKey: string, limit = 120) {
    getSurveyDefinition(surveyKey);
    const rows = await this.attempts.listByUserAndKey(userId, surveyKey, limit);
    return { attempts: rows.map(toPublic) };
  }
}
