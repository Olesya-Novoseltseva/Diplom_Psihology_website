import { describe, expect, it, vi } from "vitest";
import { JournalService } from "./JournalService.js";
import type { IJournalRepository } from "../../domain/repositories/IJournalRepository.js";
import type { ISentimentAnalyzer } from "../../domain/services/ISentimentAnalyzer.js";
import type { JournalPolicy } from "../../config/journalPolicy.js";

const policy: JournalPolicy = {
  psychologistProblemLevel: 0.72,
  distressStreakLevel: 0.58,
  sentimentStreakThreshold: -0.6,
  sentimentStreakLen: 3,
  distressStreakLen: 3,
};

describe("JournalService", () => {
  it("maps LLM analyzer errors to ServiceUnavailableError", async () => {
    const journal: IJournalRepository = {
      create: vi.fn(),
      listByUser: vi.fn(),
    };
    const sentiment: ISentimentAnalyzer = {
      analyze: vi.fn().mockRejectedValue(new Error("LLM API: 404 model missing")),
    };
    const svc = new JournalService(journal, sentiment, policy);
    await expect(svc.addEntry("user-1", "тест")).rejects.toMatchObject({
      code: "LLM_UNAVAILABLE",
      statusCode: 503,
    });
    expect(journal.create).not.toHaveBeenCalled();
  });

  it("rethrows non-LLM errors from analyzer", async () => {
    const journal: IJournalRepository = { create: vi.fn(), listByUser: vi.fn() };
    const sentiment: ISentimentAnalyzer = {
      analyze: vi.fn().mockRejectedValue(new Error("something else")),
    };
    const svc = new JournalService(journal, sentiment, policy);
    await expect(svc.addEntry("user-1", "тест")).rejects.toThrow("something else");
  });
});
