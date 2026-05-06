/** Консервативные шаблоны: при совпадении усиливаем направление к специалисту и показываем срочный блок. */
const CRISIS = [
  /\bсуицид|самоубийств|хочу умереть|лучше бы меня не было|нет смысла жить\b/i,
  /\bзакончить с собой|покончить с собой|не хочу жить\b/i,
  /\bрежу себя|самоповрежден|хочу себе навредить\b/i,
];

export function textMayIndicateCrisis(text: string): boolean {
  const t = text.trim();
  if (t.length < 4) return false;
  return CRISIS.some((re) => re.test(t));
}
