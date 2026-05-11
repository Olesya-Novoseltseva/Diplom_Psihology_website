import type { PrismaClient } from "@prisma/client";
import type { ISurveyAttemptRepository, NewSurveyAttempt } from "../../domain/repositories/ISurveyAttemptRepository.js";
import type { SurveyAttemptRecord } from "../../domain/entities/survey.types.js";

export class PrismaSurveyAttemptRepository implements ISurveyAttemptRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(row: NewSurveyAttempt): Promise<SurveyAttemptRecord> {
    const r = await this.prisma.surveyAttempt.create({
      data: {
        userId: row.userId,
        surveyKey: row.surveyKey,
        surveyId: row.surveyId,
        surveyVersion: row.surveyVersion ?? 1,
        answers: row.answers,
        score: row.score,
      },
    });
    return this.map(r);
  }

  async listByUserAndKey(userId: string, surveyKey: string, limit: number): Promise<SurveyAttemptRecord[]> {
    const rows = await this.prisma.surveyAttempt.findMany({
      where: { userId, surveyKey },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => this.map(r));
  }

  private map(r: {
    id: string;
    userId: string;
    surveyKey: string;
    answers: unknown;
    score: number;
    createdAt: Date;
  }): SurveyAttemptRecord {
    return {
      id: r.id,
      userId: r.userId,
      surveyKey: r.surveyKey,
      answers: r.answers as number[],
      score: r.score,
      createdAt: r.createdAt,
    };
  }
}
