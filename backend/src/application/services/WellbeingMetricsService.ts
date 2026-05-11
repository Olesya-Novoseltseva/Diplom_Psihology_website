import type { PrismaClient } from "@prisma/client";
import { getSurveyDefinition } from "../surveys/surveyRegistry.js";

export type WellbeingSnapshot = {
  anxietyLevel: number;
  depressionLevel: number;
  activityLevel: number;
  satisfactionLevel: number;
  latestSurveys: Array<{
    key: string;
    title: string;
    score: number;
    maxScore: number;
    severity: "low" | "moderate" | "high" | "critical";
    createdAt: string;
  }>;
  helpRecommended: boolean;
  urgentRecommended: boolean;
};

export type WellbeingPoint = {
  date: string;
  anxietyLevel: number;
  depressionLevel: number;
  activityLevel: number;
  satisfactionLevel: number;
  sourceCount: number;
};

export type WellbeingThresholds = {
  anxietyHelpLevel: number;
  anxietyUrgentLevel: number;
  depressionHelpLevel: number;
  depressionUrgentLevel: number;
};

const DEFAULT_THRESHOLDS: WellbeingThresholds = {
  anxietyHelpLevel: 70,
  anxietyUrgentLevel: 85,
  depressionHelpLevel: 65,
  depressionUrgentLevel: 80,
};

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

function severityFromPct(pct: number): "low" | "moderate" | "high" | "critical" {
  if (pct >= 80) return "critical";
  if (pct >= 65) return "high";
  if (pct >= 35) return "moderate";
  return "low";
}

export class WellbeingMetricsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly thresholds: WellbeingThresholds = DEFAULT_THRESHOLDS,
  ) {}

  async current(userId: string): Promise<WellbeingSnapshot> {
    const [journals, attempts, dbSurveys] = await Promise.all([
      this.prisma.journalEntry.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 21 }),
      this.prisma.surveyAttempt.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 30 }),
      this.prisma.survey.findMany({ include: { questions: true } }),
    ]);

    const latestByKey = new Map<string, (typeof attempts)[number]>();
    for (const attempt of attempts) {
      if (!latestByKey.has(attempt.surveyKey)) latestByKey.set(attempt.surveyKey, attempt);
    }

    const latestSurveys = [...latestByKey.values()].map((attempt) => {
      const meta = this.surveyMeta(attempt.surveyKey, dbSurveys);
      const pct = meta.maxScore > 0 ? (attempt.score / meta.maxScore) * 100 : 0;
      return {
        key: attempt.surveyKey,
        title: meta.title,
        score: attempt.score,
        maxScore: meta.maxScore,
        severity: severityFromPct(pct),
        createdAt: attempt.createdAt.toISOString(),
      };
    });

    const surveyLevels = this.levelsFromAttempts([...latestByKey.values()], dbSurveys);
    const journalLevels = this.levelsFromJournals(journals);

    const anxietyLevel = clampPct(weightedAverage([surveyLevels.anxiety, journalLevels.anxiety], [0.7, 0.3]));
    const depressionLevel = clampPct(weightedAverage([surveyLevels.depression, journalLevels.depression], [0.7, 0.3]));
    const activityLevel = clampPct(journalLevels.activity);
    const satisfactionLevel = clampPct(journalLevels.satisfaction);

    return {
      anxietyLevel,
      depressionLevel,
      activityLevel,
      satisfactionLevel,
      latestSurveys,
      helpRecommended:
        anxietyLevel >= this.thresholds.anxietyHelpLevel || depressionLevel >= this.thresholds.depressionHelpLevel,
      urgentRecommended:
        anxietyLevel >= this.thresholds.anxietyUrgentLevel || depressionLevel >= this.thresholds.depressionUrgentLevel,
    };
  }

  async daily(userId: string, from?: Date, to?: Date): Promise<WellbeingPoint[]> {
    return this.points(userId, "day", from, to);
  }

  async monthly(userId: string, from?: Date, to?: Date): Promise<WellbeingPoint[]> {
    return this.points(userId, "month", from, to);
  }

  getThresholds(): WellbeingThresholds {
    return this.thresholds;
  }

  private async points(userId: string, bucket: "day" | "month", from?: Date, to?: Date): Promise<WellbeingPoint[]> {
    const createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
    const [journals, attempts, dbSurveys] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where: { userId, ...(from || to ? { createdAt } : {}) },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.surveyAttempt.findMany({
        where: { userId, ...(from || to ? { createdAt } : {}) },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.survey.findMany({ include: { questions: true } }),
    ]);

    const grouped = new Map<string, { journals: typeof journals; attempts: typeof attempts }>();
    const keyOf = (d: Date) => (bucket === "day" ? isoDate(d) : monthKey(d));
    for (const j of journals) {
      const key = keyOf(j.createdAt);
      const cur = grouped.get(key) ?? { journals: [], attempts: [] };
      cur.journals.push(j);
      grouped.set(key, cur);
    }
    for (const a of attempts) {
      const key = keyOf(a.createdAt);
      const cur = grouped.get(key) ?? { journals: [], attempts: [] };
      cur.attempts.push(a);
      grouped.set(key, cur);
    }

    return [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => {
        const surveyLevels = this.levelsFromAttempts(data.attempts, dbSurveys);
        const journalLevels = this.levelsFromJournals(data.journals);
        return {
          date,
          anxietyLevel: clampPct(weightedAverage([surveyLevels.anxiety, journalLevels.anxiety], [0.65, 0.35])),
          depressionLevel: clampPct(weightedAverage([surveyLevels.depression, journalLevels.depression], [0.65, 0.35])),
          activityLevel: clampPct(journalLevels.activity),
          satisfactionLevel: clampPct(journalLevels.satisfaction),
          sourceCount: data.journals.length + data.attempts.length,
        };
      });
  }

  private levelsFromAttempts(
    attempts: Array<{ surveyKey: string; score: number }>,
    dbSurveys: Array<{ key: string; title: string; questions: Array<{ min: number; max: number }> }>,
  ) {
    const anxiety: number[] = [];
    const depression: number[] = [];
    const stress: number[] = [];
    for (const attempt of attempts) {
      const meta = this.surveyMeta(attempt.surveyKey, dbSurveys);
      const pct = meta.maxScore > 0 ? clampPct((attempt.score / meta.maxScore) * 100) : 0;
      if (attempt.surveyKey.includes("gad") || attempt.surveyKey.includes("anxiety")) anxiety.push(pct);
      else if (attempt.surveyKey.includes("phq") || attempt.surveyKey.includes("depress")) depression.push(pct);
      else if (attempt.surveyKey.includes("pss") || attempt.surveyKey.includes("stress")) stress.push(pct);
    }
    const stressAvg = avg(stress);
    return {
      anxiety: avgOr(anxiety, stressAvg * 0.55),
      depression: avgOr(depression, stressAvg * 0.45),
    };
  }

  private levelsFromJournals(
    journals: Array<{
      sentimentScore: number;
      problemLevel: number;
      emotionProfile: unknown;
      createdAt: Date;
    }>,
  ) {
    if (journals.length === 0) {
      return { anxiety: 0, depression: 0, activity: 50, satisfaction: 50 };
    }
    const anxiety: number[] = [];
    const depression: number[] = [];
    const activity: number[] = [];
    const satisfaction: number[] = [];
    for (const j of journals) {
      const profile = j.emotionProfile && typeof j.emotionProfile === "object" ? (j.emotionProfile as Record<string, number>) : {};
      const problemPct = j.problemLevel * 100;
      anxiety.push(Math.max((profile.anxiety ?? 0) * 100, problemPct * 0.45));
      depression.push(Math.max((profile.depression ?? 0) * 100, (profile.apathy ?? 0) * 85, (profile.sadness ?? 0) * 70, problemPct * 0.5));
      activity.push(100 - problemPct * 0.7 + Math.max(j.sentimentScore, 0) * 20);
      satisfaction.push(((j.sentimentScore + 1) / 2) * 60 + (profile.joy ?? 0) * 25 + (profile.calm ?? 0) * 15 - problemPct * 0.2);
    }
    return {
      anxiety: avg(anxiety),
      depression: avg(depression),
      activity: avg(activity),
      satisfaction: avg(satisfaction),
    };
  }

  private surveyMeta(
    key: string,
    dbSurveys: Array<{ key: string; title: string; questions: Array<{ min: number; max: number }> }>,
  ) {
    const db = dbSurveys.find((s) => s.key === key);
    if (db) {
      return {
        title: db.title,
        maxScore: db.questions.reduce((sum, q) => sum + q.max, 0),
      };
    }
    try {
      const def = getSurveyDefinition(key);
      return {
        title: def.title,
        maxScore: def.questions.reduce((sum, q) => sum + q.max, 0),
      };
    } catch {
      return { title: key, maxScore: 100 };
    }
  }
}

function avg(ns: number[]): number {
  if (ns.length === 0) return 0;
  return ns.reduce((s, n) => s + n, 0) / ns.length;
}

function avgOr(ns: number[], fallback: number): number {
  return ns.length ? avg(ns) : fallback;
}

function weightedAverage(values: number[], weights: number[]): number {
  let sum = 0;
  let weightSum = 0;
  values.forEach((v, i) => {
    if (Number.isFinite(v)) {
      sum += v * (weights[i] ?? 1);
      weightSum += weights[i] ?? 1;
    }
  });
  return weightSum ? sum / weightSum : 0;
}
