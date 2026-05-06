import { isPrimaryEmotion, PRIMARY_EMOTIONS, type PrimaryEmotion } from "./emotions.js";
import type { EmotionProfile, JournalAnalysisResult, SentimentLabel } from "./JournalAnalysisResult.js";

export const LABEL_POSITIVE_MIN = 0.15;
export const LABEL_NEGATIVE_MAX = -0.15;

export function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

export function clampNeg1Pos1(x: number): number {
  if (Number.isNaN(x)) return 0;
  return Math.min(1, Math.max(-1, x));
}

export function labelFromScore(score: number): SentimentLabel {
  if (score > LABEL_POSITIVE_MIN) return "positive";
  if (score < LABEL_NEGATIVE_MAX) return "negative";
  return "neutral";
}

export function normalizeEmotionProfile(raw: unknown): EmotionProfile {
  if (!raw || typeof raw !== "object") return { neutral: 0.5 };
  const out: EmotionProfile = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!isPrimaryEmotion(k)) continue;
    const n = typeof v === "number" ? v : Number(v);
    out[k] = clamp01(Number.isFinite(n) ? n : 0);
  }
  if (Object.keys(out).length === 0) return { neutral: 0.5 };
  return out;
}

export function pickPrimaryFromProfile(profile: EmotionProfile): { primary: PrimaryEmotion; intensity: number } {
  let primary: PrimaryEmotion = "neutral";
  let intensity = 0;
  for (const e of PRIMARY_EMOTIONS) {
    const v = profile[e] ?? 0;
    if (v > intensity) {
      intensity = v;
      primary = e;
    }
  }
  if (intensity === 0) {
    return { primary: "neutral", intensity: 0.4 };
  }
  return { primary, intensity: clamp01(intensity) };
}

/** Приводит частично заполненный результат к консистентному виду. */
export function finalizeAnalysis(partial: Omit<JournalAnalysisResult, "label"> & { label?: SentimentLabel }): JournalAnalysisResult {
  const score = clampNeg1Pos1(partial.score);
  const label = labelFromScore(score);
  const profile = partial.emotionProfile;
  let primary = partial.primaryEmotion;
  let intensity = clamp01(partial.primaryIntensity);
  if (!isPrimaryEmotion(primary)) {
    const p = pickPrimaryFromProfile(profile);
    primary = p.primary;
    intensity = p.intensity;
  } else {
    const fromProfile = profile[primary];
    intensity = clamp01(typeof fromProfile === "number" ? fromProfile : partial.primaryIntensity || 0.55);
  }
  return {
    score,
    label,
    primaryEmotion: primary,
    primaryIntensity: intensity,
    emotionProfile: profile,
    problemLevel: clamp01(partial.problemLevel),
    suggestPsychologist: Boolean(partial.suggestPsychologist),
    adviceFromModel: partial.adviceFromModel.trim(),
  };
}
