/** Соответствует primaryEmotion с бэкенда. */
export const EMOTION_LABEL_RU: Record<string, string> = {
  depression: "депрессивный фон / уныние",
  anxiety: "тревога",
  sadness: "грусть",
  anger: "злость / раздражение",
  joy: "радость",
  kindness_warmth: "доброта, тепло",
  calm: "спокойствие",
  apathy: "безразличие",
  shame_guilt: "стыд / вина",
  hope: "надежда",
  overwhelm: "перегруз",
  loneliness: "одиночество",
  neutral: "нейтрально",
};

export function emotionRu(slug: string): string {
  return EMOTION_LABEL_RU[slug] ?? slug;
}
