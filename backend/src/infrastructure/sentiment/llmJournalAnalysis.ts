import { emotionListForLlmPrompt, isPrimaryEmotion, type PrimaryEmotion } from "../../domain/journal/emotions.js";
import { finalizeAnalysis, normalizeEmotionProfile } from "../../domain/journal/analysisNormalize.js";
import type { JournalAnalysisResult } from "../../domain/journal/JournalAnalysisResult.js";

export const JOURNAL_LLM_SYSTEM_RU = `Ты помогаешь студенту осмыслить настроение по короткой дневниковой записи на русском.
Верни СТРОГО один JSON-объект без markdown и без текста вокруг.

Поля:
- "score": число от -1 до 1 (общий тон: -1 тяжело, 0 нейтрально, +1 светло).
- "label": ровно одно из: "positive", "negative", "neutral" (согласуй с score).
- "primaryEmotion": одна преобладающая эмоция из списка: ${emotionListForLlmPrompt()}
- "emotionIntensity": объект: ключи только из того же списка, значения от 0 до 1. Если текст не пустой — хотя бы несколько ненулевых ключей.
- "problemLevel": число от 0 до 1 — насколько запись отражает нагрузку и дистресс (0 спокойно, ~0.5 заметно тяжело, ~0.85 очень тяжело или нужна поддержка).
- "suggestPsychologist": true/false — true при стойкой боли, безнадёжности, панике, намерении навредить себе или если человек явно не справляется сам.
- "advice": 1–2 коротких предложения на «вы»: конкретный следующий шаг (сон, прогулка, дыхание, кому написать, к кому в вузе обратиться). Без диагнозов и без назначений лекарств. Тон поддерживающий.

Если в сообщении есть контекст опросников, используй его как дополнительный фон: не ставь диагноз, но учитывай высокие уровни тревожности/депрессивности при осторожности совета.
Если текст нейтрален — primaryEmotion: "neutral", problemLevel близок к 0, advice короткий и ровный.`;

export function buildJournalUserPrompt(
  text: string,
  wellbeing?: {
    anxietyLevel: number;
    depressionLevel: number;
    activityLevel: number;
    satisfactionLevel: number;
    latestSurveys: Array<{ key: string; title: string; score: number; maxScore: number; severity: string; createdAt: string }>;
  },
): string {
  const surveyBlock = wellbeing
    ? `\nКонтекст самонаблюдения пользователя (не диагноз, учитывать осторожно):\n${JSON.stringify(
        {
          anxietyLevel: wellbeing.anxietyLevel,
          depressionLevel: wellbeing.depressionLevel,
          activityLevel: wellbeing.activityLevel,
          satisfactionLevel: wellbeing.satisfactionLevel,
          latestSurveys: wellbeing.latestSurveys.slice(0, 5),
        },
        null,
        2,
      )}\n`
    : "";
  return `${surveyBlock}Запись пользователя:\n---\n${text.trim().slice(0, 12_000)}\n---`;
}

const MAX_ADVICE_LEN = 520;

export function journalAnalysisFromLlmRawText(raw: string): JournalAnalysisResult {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  let parsed: unknown;
  try {
    parsed = JSON.parse(slice);
  } catch {
    return finalizeAnalysis({
      score: 0,
      primaryEmotion: "neutral",
      primaryIntensity: 0.4,
      emotionProfile: { neutral: 0.6 },
      problemLevel: 0,
      suggestPsychologist: false,
      adviceFromModel: "",
    });
  }
  if (!parsed || typeof parsed !== "object") {
    return finalizeAnalysis({
      score: 0,
      primaryEmotion: "neutral",
      primaryIntensity: 0.4,
      emotionProfile: { neutral: 0.6 },
      problemLevel: 0,
      suggestPsychologist: false,
      adviceFromModel: "",
    });
  }
  const o = parsed as Record<string, unknown>;
  const scoreRaw = o.score;
  const scoreN = typeof scoreRaw === "number" ? scoreRaw : Number(scoreRaw);
  const score = Number.isFinite(scoreN) ? scoreN : 0;

  const rawPrimary = typeof o.primaryEmotion === "string" ? o.primaryEmotion : "neutral";
  const primary: PrimaryEmotion = isPrimaryEmotion(rawPrimary) ? rawPrimary : "neutral";

  const profile = normalizeEmotionProfile(o.emotionIntensity ?? o.emotion_profile);

  const plRaw = o.problemLevel ?? o.problem_level;
  const plN = typeof plRaw === "number" ? plRaw : Number(plRaw);
  const problemLevel = Number.isFinite(plN) ? plN : 0;

  const suggest =
    o.suggestPsychologist === true ||
    o.suggest_psychologist === true ||
    String(o.suggestPsychologist).toLowerCase() === "true";

  let advice = typeof o.advice === "string" ? o.advice : "";
  advice = advice.replace(/\s+/g, " ").trim().slice(0, MAX_ADVICE_LEN);

  return finalizeAnalysis({
    score,
    primaryEmotion: primary,
    primaryIntensity: profile[primary] ?? 0.5,
    emotionProfile: profile,
    problemLevel,
    suggestPsychologist: suggest,
    adviceFromModel: advice,
  });
}
