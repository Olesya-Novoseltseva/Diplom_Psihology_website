import type { PrismaClient } from "@prisma/client";
import type { IJournalRepository, NewJournalEntry } from "../../domain/repositories/IJournalRepository.js";
import type { JournalEntryRecord } from "../../domain/entities/journal.types.js";
import { isPrimaryEmotion } from "../../domain/journal/emotions.js";
import type { EmotionProfile } from "../../domain/journal/JournalAnalysisResult.js";

export class PrismaJournalRepository implements IJournalRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(row: NewJournalEntry): Promise<JournalEntryRecord> {
    const e = await this.prisma.journalEntry.create({
      data: {
        userId: row.userId,
        content: row.content,
        sentimentScore: row.sentimentScore,
        sentimentLabel: row.sentimentLabel,
        primaryEmotion: row.primaryEmotion,
        primaryIntensity: row.primaryIntensity,
        emotionProfile: row.emotionProfile as object,
        problemLevel: row.problemLevel,
        suggestPsychologist: row.suggestPsychologist,
        adviceFromModel: row.adviceFromModel,
      },
    });
    return this.map(e);
  }

  async listByUser(userId: string, limit: number): Promise<JournalEntryRecord[]> {
    const rows = await this.prisma.journalEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => this.map(r));
  }

  private map(e: {
    id: string;
    userId: string;
    content: string;
    sentimentScore: number;
    sentimentLabel: string;
    primaryEmotion: string;
    primaryIntensity: number;
    emotionProfile: unknown;
    problemLevel: number;
    suggestPsychologist: boolean;
    adviceFromModel: string | null;
    createdAt: Date;
  }): JournalEntryRecord {
    const profile = normalizeProfile(e.emotionProfile);
    const pe = isPrimaryEmotion(e.primaryEmotion) ? e.primaryEmotion : "neutral";
    return {
      id: e.id,
      userId: e.userId,
      content: e.content,
      sentimentScore: e.sentimentScore,
      sentimentLabel: e.sentimentLabel,
      primaryEmotion: pe,
      primaryIntensity: e.primaryIntensity,
      emotionProfile: profile,
      problemLevel: e.problemLevel,
      suggestPsychologist: e.suggestPsychologist,
      adviceFromModel: e.adviceFromModel,
      createdAt: e.createdAt,
    };
  }
}

function normalizeProfile(raw: unknown): EmotionProfile {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as EmotionProfile;
}
