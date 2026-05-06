import { describe, expect, it } from "vitest";
import { journalAnalysisFromLlmRawText } from "./llmJournalAnalysis.js";

describe("journalAnalysisFromLlmRawText", () => {
  it("parses rich JSON", () => {
    const raw = JSON.stringify({
      score: -0.4,
      label: "negative",
      primaryEmotion: "anxiety",
      emotionIntensity: { anxiety: 0.9, sadness: 0.3, neutral: 0.1 },
      problemLevel: 0.62,
      suggestPsychologist: false,
      advice: "Сделайте три медленных выдоха.",
    });
    const r = journalAnalysisFromLlmRawText(raw);
    expect(r.primaryEmotion).toBe("anxiety");
    expect(r.problemLevel).toBeCloseTo(0.62);
    expect(r.adviceFromModel).toContain("выдоха");
    expect(r.label).toBe("negative");
  });

  it("falls back on invalid JSON", () => {
    const r = journalAnalysisFromLlmRawText("not json");
    expect(r.primaryEmotion).toBe("neutral");
    expect(r.problemLevel).toBe(0);
  });
});
