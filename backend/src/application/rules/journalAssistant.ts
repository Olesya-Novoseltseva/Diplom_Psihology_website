import type { JournalAnalysisResult } from "../../domain/journal/JournalAnalysisResult.js";
import type { PrimaryEmotion } from "../../domain/journal/emotions.js";

const URGENT_RU =
  "Если вы в острой опасности или есть мысли о самоповреждении — обратитесь за срочной помощью: вызовите скорую (112) или немедленно свяжитесь с кем-то из близких рядом с вами.";

const PSYCHOLOGIST_RU =
  "По оценке записи нагрузка на психику заметно высокая. Имеет смысл в ближайшие дни договориться о встрече с психологом вуза или очным специалистом — это нормальная забота о себе.";

const PSYCHOLOGIST_AFTER_CRISIS_RU =
  "Пожалуйста, не оставайте риск без поддержки: обратитесь к специалисту или доверенному человеку как можно скорее.";

const DISTRESS_STREAK_RU =
  "Несколько последних записей подряд с выраженным дистрессом. Стоит снизить планку задач на пару дней и при возможности написать в службу поддержки вуза.";

const NEGATIVE_STREAK_RU =
  "Подряд идут тяжёлые записи. Можно попробовать спокойное дыхание 4–4–6 или заглянуть в «Самопомощь».";

function fallbackLine(emotion: PrimaryEmotion, problemLevel: number): string {
  const hi = problemLevel >= 0.55;
  const map: Record<PrimaryEmotion, string> = {
    depression: hi
      ? "Сейчас может тянуть вниз сильнее обычного. Разрешите себе маленький шаг: вода, короткая прогулка или одно сообщение человеку, которому доверяете."
      : "Вы описываете непростой фон — это уже осознанность. Можно не решать всё сразу, только заметить, что с вами происходит.",
    anxiety: hi
      ? "Тревога может сужать внимание. Заземление: назовите вслух 5 предметов вокруг и сделайте 3 медленных выдоха длиннее вдоха."
      : "Тревожные ноты в тексте есть — попробуйте на минуту замедлиться и записать одно, что сейчас под вашим контролем.",
    sadness: hi
      ? "Грусть в записи заметна. Позвольте себе побыть с ней без оценок и при желании поделиться с кем-то близким."
      : "Грустные переживания — часть жизни; вы уже даёте им место, выписывая это.",
    anger: hi
      ? "Злость сигналит о границах. Можно выписать, что именно задело, и отложить ответ на час — так проще не обжечься."
      : "Раздражение в тексте — нормальная реакция; вы формулируете её словами, а не только импульсом.",
    joy: "Приятно видеть светлые ноты — закрепите: что сегодня дало этот оттенок?",
    kindness_warmth: "Тепло в формулировках — ресурс. Можно коротко отметить, кому или чему вы это отдаёте.",
    calm: "Спокойный тон записи — хорошая опора. При желании отметьте, что помогло прийти к этому состоянию.",
    apathy: hi
      ? "Безразличие иногда прикрывает усталость. Попробуйте минимум заботы о теле: еда, сон, короткий свет днём."
      : "Нейтральный настрой тоже информация — без давления «должен чувствовать больше».",
    shame_guilt: hi
      ? "Чувство вины жёсткое — чаще всего оно преувеличивает ответственность. Спросите себя: что бы вы сказали другу в такой ситуации?"
      : "Вы замечаете внутреннюю критику — это можно мягко проверять на факты, не на оценки «плохой/хороший».",
    hope: "Надежда в тексте — якорь. Маленький следующий шаг может быть очень приземлённым.",
    overwhelm: hi
      ? "Перегруз реален — сократите список «на сегодня» до одного пункта и разрешите остальное перенести."
      : "Много задач в голове — попробуйте выписать всё и вычеркнуть то, что может подождать.",
    loneliness: hi
      ? "Одиночество больно. Даже короткий контакт (сообщение, чат поддержки) может чуть смягчить изоляцию."
      : "Чувство отдельности от мира многие переживают — вы это не стесняетесь формулировать.",
    neutral: "Спасибо, что делитесь. Короткая запись уже помогает увидеть мысли с дистанции.",
  };
  return map[emotion];
}

export type JournalAssistantContext = {
  negativeStreak: boolean;
  distressStreak: boolean;
  psychologistSuggested: boolean;
  crisisLanguageDetected: boolean;
};

export function buildJournalAssistantMessage(
  analysis: JournalAnalysisResult,
  ctx: JournalAssistantContext,
): string {
  const parts: string[] = [];

  if (ctx.crisisLanguageDetected) {
    parts.push(URGENT_RU);
  }

  const main = analysis.adviceFromModel.trim() || fallbackLine(analysis.primaryEmotion, analysis.problemLevel);
  parts.push(main);

  if (ctx.psychologistSuggested) {
    parts.push(ctx.crisisLanguageDetected ? PSYCHOLOGIST_AFTER_CRISIS_RU : PSYCHOLOGIST_RU);
  }

  if (!ctx.crisisLanguageDetected && ctx.distressStreak) {
    parts.push(DISTRESS_STREAK_RU);
  } else if (!ctx.crisisLanguageDetected && ctx.negativeStreak && !ctx.distressStreak) {
    parts.push(NEGATIVE_STREAK_RU);
  }

  return parts.join("\n\n");
}
