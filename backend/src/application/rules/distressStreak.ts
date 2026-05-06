/** Последние записи от новых к старым; все problemLevel >= threshold. */
export function isDistressStreak(newestFirstLevels: number[], threshold: number, streakLength: number): boolean {
  if (newestFirstLevels.length < streakLength) return false;
  return newestFirstLevels.slice(0, streakLength).every((x) => x >= threshold);
}
