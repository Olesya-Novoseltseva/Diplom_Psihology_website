export type MonthlyPoint = { month: string; avg: number; count: number };

/** Группирует прохождения по месяцам (средний балл, если за месяц несколько раз). */
export function monthlyAverages(attempts: { createdAt: string; score: number }[]): MonthlyPoint[] {
  const map = new Map<string, { sum: number; count: number }>();
  for (const a of attempts) {
    const d = new Date(a.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const cur = map.get(key) ?? { sum: 0, count: 0 };
    cur.sum += a.score;
    cur.count += 1;
    map.set(key, cur);
  }
  return [...map.entries()]
    .sort(([x], [y]) => x.localeCompare(y))
    .map(([month, v]) => ({ month, avg: Math.round((v.sum / v.count) * 10) / 10, count: v.count }));
}
