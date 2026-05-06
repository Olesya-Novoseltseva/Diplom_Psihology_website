import type { JournalEntryDto } from "../api/JournalApiService.js";

export type JournalTrendPoint = {
  id: string;
  label: string;
  sentiment: number;
  burdenPct: number;
};

/** Хронологический порядок от старых к новым — для оси времени на графике. */
export function buildJournalTrendPoints(entries: JournalEntryDto[]): JournalTrendPoint[] {
  return [...entries]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((e) => ({
      id: e.id,
      label: new Date(e.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
      sentiment: e.sentimentScore,
      burdenPct: Math.round(e.problemLevel * 100),
    }));
}
