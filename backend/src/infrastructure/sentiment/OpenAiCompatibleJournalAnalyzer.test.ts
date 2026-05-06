import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenAiCompatibleJournalAnalyzer } from "./OpenAiCompatibleJournalAnalyzer.js";

describe("OpenAiCompatibleJournalAnalyzer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses completion into analysis", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  score: -0.2,
                  primaryEmotion: "sadness",
                  emotionIntensity: { sadness: 0.8, neutral: 0.2 },
                  problemLevel: 0.4,
                  suggestPsychologist: false,
                  advice: "Позвольте себе отдых.",
                }),
              },
            },
          ],
        }),
      }),
    );
    const a = new OpenAiCompatibleJournalAnalyzer("http://localhost:9/v1", "m");
    const r = await a.analyze("грустно");
    expect(r.primaryEmotion).toBe("sadness");
    expect(r.adviceFromModel).toContain("отдых");
  });
});
