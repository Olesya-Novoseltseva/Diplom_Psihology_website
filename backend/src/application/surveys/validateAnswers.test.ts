import { describe, expect, it } from "vitest";
import { PHQ9_SURVEY } from "./phq9Survey.js";
import { PSS10_SURVEY } from "./pss10Survey.js";
import { assertValidAnswers } from "./validateAnswers.js";
import { BadRequestError } from "../../domain/errors/HttpError.js";

describe("assertValidAnswers", () => {
  it("принимает корректные ответы PHQ-9", () => {
    expect(() => assertValidAnswers(PHQ9_SURVEY, [0, 1, 2, 3, 0, 1, 2, 3, 0])).not.toThrow();
  });

  it("отклоняет неверную длину", () => {
    expect(() => assertValidAnswers(PHQ9_SURVEY, [0, 0, 0])).toThrow(BadRequestError);
  });

  it("считает сумму PHQ-9", () => {
    expect(PHQ9_SURVEY.score([1, 1, 1, 1, 1, 1, 1, 1, 1])).toBe(9);
  });

  it("PSS-10 применяет обратное кодирование", () => {
    expect(PSS10_SURVEY.score(Array(10).fill(0))).toBe(16);
    expect(PSS10_SURVEY.score(Array(10).fill(4))).toBe(24);
    expect(() => assertValidAnswers(PSS10_SURVEY, Array(10).fill(2))).not.toThrow();
  });
});
