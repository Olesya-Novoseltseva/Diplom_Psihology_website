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
        status: 200,
        text: async () =>
          JSON.stringify({
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

  it("sends response_format json_object when jsonMode is enabled", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  score: 0,
                  primaryEmotion: "neutral",
                  emotionIntensity: { neutral: 1 },
                  problemLevel: 0,
                  suggestPsychologist: false,
                  advice: "Ок.",
                }),
              },
            },
          ],
        }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const a = new OpenAiCompatibleJournalAnalyzer("http://localhost:9/v1", "qwen", undefined, true);
    await a.analyze("тест");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body.response_format).toEqual({ type: "json_object" });
  });

  it("wraps fetch failures in a helpful error", async () => {
    const err = new TypeError("fetch failed");
    (err as Error & { cause?: unknown }).cause = { code: "ECONNREFUSED" };
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(err));
    const a = new OpenAiCompatibleJournalAnalyzer("http://127.0.0.1:8000/v1", "m");
    await expect(a.analyze("тест")).rejects.toThrow(/LLM API: сетевой сбой/);
  });
});
