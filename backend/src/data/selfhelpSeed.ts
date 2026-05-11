export type HelpTopicSeed = {
  slug: string;
  title: string;
  summary: string;
  disclaimer: string;
  categories: string[];
  sections: Array<{ heading: string; paragraphs: string[]; bullets?: string[] }>;
};

const commonDisclaimer =
  "Если состояние долго не улучшается или мешает учёбе — имеет смысл обратиться в службу поддержки вуза.";

export const HELP_TOPICS: HelpTopicSeed[] = [
  {
    slug: "dyhanie",
    title: "Спокойное дыхание",
    summary: "Короткие техники, чтобы снизить телесное напряжение за 2–5 минут.",
    disclaimer: commonDisclaimer,
    categories: ["anxiety", "stress"],
    sections: [
      {
        heading: "Дыхание квадрат",
        paragraphs: ["Сядьте ровно, стопы на полу. Дышите носом, если комфортно."],
        bullets: ["Вдох — 4 счёта.", "Пауза — 4 счёта.", "Выдох — 4 счёта.", "Пауза — 4 счёта."],
      },
    ],
  },
  {
    slug: "trevoga",
    title: "Когда накатывает тревога",
    summary: "Простые шаги заземления: вернуть внимание к телу и окружению.",
    disclaimer: commonDisclaimer,
    categories: ["anxiety"],
    sections: [
      {
        heading: "5-4-3-2-1",
        paragraphs: ["Назовите про себя несколько деталей вокруг."],
        bullets: ["5 вещей, которые видите.", "4 ощущения тела.", "3 звука.", "2 запаха.", "1 вкус или хорошее воспоминание."],
      },
    ],
  },
  {
    slug: "aktivaciya",
    title: "Мягкая активация",
    summary: "Небольшие действия при апатии и снижении энергии.",
    disclaimer: commonDisclaimer,
    categories: ["depression", "activity"],
    sections: [
      {
        heading: "Один маленький шаг",
        paragraphs: ["Выберите действие на 2–5 минут: вода, душ, короткая прогулка или сообщение близкому человеку."],
      },
    ],
  },
  {
    slug: "son",
    title: "Сон и восстановление",
    summary: "Базовые привычки, которые помогают восстановиться перед учёбой.",
    disclaimer: commonDisclaimer,
    categories: ["stress", "sleep"],
    sections: [
      {
        heading: "Вечерний минимум",
        paragraphs: ["За 30 минут до сна снизьте яркость экрана и выпишите задачи на завтра, чтобы не держать их в голове."],
      },
    ],
  },
];
