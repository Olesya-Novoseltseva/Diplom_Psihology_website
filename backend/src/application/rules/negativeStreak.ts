/** Последние записи в порядке от новых к старым. */
export function isNegativeStreak(
  newestFirstScores: number[],
  threshold: number,
  streakLength: number,
): boolean {
  if (newestFirstScores.length < streakLength) return false;
  return newestFirstScores
    .slice(0, streakLength)
    .every((score) => score < threshold);
}
