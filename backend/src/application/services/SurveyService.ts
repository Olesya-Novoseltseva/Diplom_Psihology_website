import type { PrismaClient } from "@prisma/client";
import type { ISurveyAttemptRepository } from "../../domain/repositories/ISurveyAttemptRepository.js";
import type { SurveyAttemptPublic } from "../../domain/entities/survey.types.js";
import type { SurveyDefinition } from "../surveys/survey.types.js";
import { getSurveyDefinition, listSurveyCatalog } from "../surveys/surveyRegistry.js";
import { assertValidAnswers } from "../surveys/validateAnswers.js";

type DbSurveyDefinition = {
  id: string;
  key: string;
  title: string;
  description: string;
  sharedOptionLabels: unknown;
  scoreBands: unknown;
  version: number;
  questions: Array<{ id: string; text: string; min: number; max: number; reverseScore: boolean }>;
};

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
  constructor(
    private readonly attempts: ISurveyAttemptRepository,
    private readonly prisma?: PrismaClient,
  ) {}

  async catalog() {
    const db = await this.dbSurveys();
    if (db.length === 0) return listSurveyCatalog();
    return db.map((s) => ({
      key: s.key,
      title: s.title,
      description: s.description,
      questionCount: s.questions.length,
    }));
  }

  async definition(key: string) {
    const db = await this.dbSurvey(key);
    if (db) {
      const scoreMin = db.questions.reduce((s, q) => s + q.min, 0);
      const scoreMax = db.questions.reduce((s, q) => s + q.max, 0);
      return {
        key: db.key,
        title: db.title,
        description: db.description,
        questions: db.questions.map((q) => ({ id: q.id, text: q.text, min: q.min, max: q.max })),
        sharedOptionLabels: Array.isArray(db.sharedOptionLabels) ? (db.sharedOptionLabels as string[]) : undefined,
        scoreBandsHint: scoreBandsHint(db.scoreBands),
        scoreMin,
        scoreMax,
      };
    }
    const s = this.staticDefinition(key);
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
    const db = await this.dbSurvey(surveyKey);
    const def = db ? dbToDefinition(db) : this.staticDefinition(surveyKey);
    assertValidAnswers(def, answers);
    const score = def.score(answers);
    const saved = await this.attempts.create({
      userId,
      surveyKey,
      surveyId: db?.id,
      surveyVersion: db?.version,
      answers,
      score,
    });
    return {
      attempt: toPublic(saved),
      interpretation: def.interpret(score),
    };
  }

  async history(userId: string, surveyKey: string, limit = 120) {
    if (!(await this.dbSurvey(surveyKey))) this.staticDefinition(surveyKey);
    const rows = await this.attempts.listByUserAndKey(userId, surveyKey, limit);
    return { attempts: rows.map(toPublic) };
  }

  private staticDefinition(key: string): SurveyDefinition {
    return getSurveyDefinition(key);
  }

  private dbSurveys() {
    return (
      this.prisma?.survey.findMany({
        where: { isActive: true },
        include: { questions: { orderBy: { sortOrder: "asc" } } },
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      }) ?? Promise.resolve([])
    );
  }

  private dbSurvey(key: string) {
    return (
      this.prisma?.survey.findFirst({
        where: { key, isActive: true },
        include: { questions: { orderBy: { sortOrder: "asc" } } },
      }) ?? Promise.resolve(null)
    );
  }
}

function dbToDefinition(db: DbSurveyDefinition): SurveyDefinition {
  return {
    key: db.key,
    title: db.title,
    description: db.description,
    questions: db.questions.map((q) => ({ id: q.id, text: q.text, min: q.min, max: q.max })),
    sharedOptionLabels: Array.isArray(db.sharedOptionLabels) ? (db.sharedOptionLabels as string[]) : undefined,
    scoreBandsHint: scoreBandsHint(db.scoreBands),
    score: (answers) => answers.reduce((sum, answer, i) => {
      const q = db.questions[i];
      if (!q) return sum;
      return sum + (q.reverseScore ? q.max - answer + q.min : answer);
    }, 0),
    interpret: (scoreResult) => interpretByBands(scoreResult, db.scoreBands),
  };
}

function scoreBandsHint(raw: unknown): string | undefined {
  const bands = Array.isArray(raw) ? raw : [];
  if (!bands.length) return undefined;
  return bands
    .map((b) => {
      const o = b as Record<string, unknown>;
      return `${String(o.min)}-${String(o.max)}: ${String(o.label ?? o.text ?? "")}`;
    })
    .join("; ");
}

function interpretByBands(scoreResult: number, raw: unknown): string {
  const bands = Array.isArray(raw) ? raw : [];
  for (const b of bands) {
    const o = b as Record<string, unknown>;
    const min = Number(o.min);
    const max = Number(o.max);
    if (Number.isFinite(min) && Number.isFinite(max) && scoreResult >= min && scoreResult <= max) {
      return String(o.text ?? o.label ?? "Результат сохранён. Используйте его для самонаблюдения.");
    }
  }
  return "Результат сохранён. Используйте его для самонаблюдения; при устойчивом ухудшении обратитесь за очной поддержкой.";
}
