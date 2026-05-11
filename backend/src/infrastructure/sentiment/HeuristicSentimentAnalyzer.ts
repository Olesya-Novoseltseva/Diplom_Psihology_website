import { finalizeAnalysis } from "../../domain/journal/analysisNormalize.js";
import type { EmotionProfile } from "../../domain/journal/JournalAnalysisResult.js";
import type { PrimaryEmotion } from "../../domain/journal/emotions.js";
import type { ISentimentAnalyzer, JournalAnalysisInput } from "../../domain/services/ISentimentAnalyzer.js";
import { textMayIndicateCrisis } from "../../application/safety/crisisLanguage.js";

const RULES: Array<{ re: RegExp; emotion: PrimaryEmotion; w: number }> = [
  { re: /\b(суицид|самоубий|не хочу жить|лучше бы меня не было)\b/i, emotion: "depression", w: 0.95 },
  { re: /\b(депресс|унын|бессмыслен|ничего не хочу|пустота внутри)\b/i, emotion: "depression", w: 0.75 },
  { re: /\b(тревог|паник|страшно|не могу успоко|колотится сердце)\b/i, emotion: "anxiety", w: 0.8 },
  { re: /\b(груст|плак|тоск|печаль)\b/i, emotion: "sadness", w: 0.75 },
  { re: /\b(бесит|злюсь|раздраж|ярость)\b/i, emotion: "anger", w: 0.7 },
  { re: /\b(рад|счастлив|классно|ура|получилось)\b/i, emotion: "joy", w: 0.75 },
  { re: /\b(добр|люблю|благодар|тепло на душе)\b/i, emotion: "kindness_warmth", w: 0.65 },
  { re: /\b(спокоен|спокойн|легче стало|умиротвор)\b/i, emotion: "calm", w: 0.65 },
  { re: /\b(всё равно|безразлич|онемел|ничего не чувствую)\b/i, emotion: "apathy", w: 0.7 },
  { re: /\b(стыдно|виноват|вина)\b/i, emotion: "shame_guilt", w: 0.7 },
  { re: /\b(надежд|поверю|будет лучше)\b/i, emotion: "hope", w: 0.6 },
  { re: /\b(выгор|не успеваю|завал|не тяну)\b/i, emotion: "overwhelm", w: 0.75 },
  { re: /\b(устал|устала|не высыпа|мало сплю|не сплю)\b/i, emotion: "overwhelm", w: 0.72 },
  { re: /\b(один|одиночеств|никому не нужен)\b/i, emotion: "loneliness", w: 0.72 },
];

function profileFromText(text: string): { profile: EmotionProfile; primary: PrimaryEmotion; maxW: number } {
  const profile: EmotionProfile = {};
  for (const { re, emotion, w } of RULES) {
    if (re.test(text)) {
      profile[emotion] = Math.max(profile[emotion] ?? 0, w);
    }
  }
  let primary: PrimaryEmotion = "neutral";
  let maxW = 0;
  for (const [k, v] of Object.entries(profile)) {
    if ((v ?? 0) > maxW) {
      maxW = v ?? 0;
      primary = k as PrimaryEmotion;
    }
  }
  if (maxW === 0) {
    profile.neutral = 0.55;
    primary = "neutral";
    maxW = 0.55;
  }
  return { profile, primary, maxW: maxW };
}

function scoreAndProblem(primary: PrimaryEmotion, maxW: number): { score: number; problem: number } {
  const neg: PrimaryEmotion[] = ["depression", "anxiety", "sadness", "anger", "apathy", "shame_guilt", "overwhelm", "loneliness"];
  const pos: PrimaryEmotion[] = ["joy", "kindness_warmth", "calm", "hope"];

  let score = 0;
  if (neg.includes(primary)) score = -0.35 - maxW * 0.45;
  else if (pos.includes(primary)) score = 0.25 + maxW * 0.45;
  else score = 0;

  let problem = 0.12;
  if (neg.includes(primary)) problem = 0.28 + maxW * 0.42;
  if (primary === "depression" || primary === "overwhelm") problem += 0.08;

  problem = Math.min(1, problem);
  score = Math.max(-1, Math.min(1, score));
  return { score, problem };
}

/** Локально, без сети. Для продакшена с богатой разметкой используйте SENTIMENT_PROVIDER=openai. */
export class HeuristicSentimentAnalyzer implements ISentimentAnalyzer {
  async analyze(input: string | JournalAnalysisInput) {
    const text = typeof input === "string" ? input : input.text;
    const wellbeing = typeof input === "string" ? undefined : input.wellbeing;
    const t = text.trim();
    const crisis = textMayIndicateCrisis(t);
    const { profile, primary, maxW } = profileFromText(t);
    const { score, problem } = scoreAndProblem(primary, maxW);
    let problemLevel = crisis ? 0.95 : problem;
    if (wellbeing) {
      const surveyBurden = Math.max(wellbeing.anxietyLevel, wellbeing.depressionLevel) / 100;
      problemLevel = Math.min(1, problemLevel * 0.7 + surveyBurden * 0.3);
    }
    const suggestPsychologist = crisis || problemLevel >= 0.72 || wellbeing?.urgentRecommended === true;

    return finalizeAnalysis({
      score,
      primaryEmotion: crisis ? "depression" : primary,
      primaryIntensity: crisis ? 0.95 : maxW,
      emotionProfile: crisis ? { ...profile, depression: Math.max(profile.depression ?? 0, 0.9) } : profile,
      problemLevel,
      suggestPsychologist,
      adviceFromModel: "",
    });
  }
}
