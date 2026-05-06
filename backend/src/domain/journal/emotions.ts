/** Допустимые значения primaryEmotion / ключи emotionProfile (англ. slug для API и БД). */
export const PRIMARY_EMOTIONS = [
  "depression",
  "anxiety",
  "sadness",
  "anger",
  "joy",
  "kindness_warmth",
  "calm",
  "apathy",
  "shame_guilt",
  "hope",
  "overwhelm",
  "loneliness",
  "neutral",
] as const;

export type PrimaryEmotion = (typeof PRIMARY_EMOTIONS)[number];

const PRIMARY_SET = new Set<string>(PRIMARY_EMOTIONS);

export function isPrimaryEmotion(s: string): s is PrimaryEmotion {
  return PRIMARY_SET.has(s);
}

/** Подписи для UI / диплома. */
export const EMOTION_LABEL_RU: Record<PrimaryEmotion, string> = {
  depression: "депрессивный фон / уныние",
  anxiety: "тревога",
  sadness: "грусть",
  anger: "злость или раздражение",
  joy: "радость",
  kindness_warmth: "доброта, тепло",
  calm: "спокойствие",
  apathy: "безразличие, онемение",
  shame_guilt: "стыд или вина",
  hope: "надежда",
  overwhelm: "перегруз, «не справляюсь»",
  loneliness: "одиночество",
  neutral: "нейтрально, без яркой окраски",
};

export function emotionListForLlmPrompt(): string {
  return PRIMARY_EMOTIONS.join(", ");
}
