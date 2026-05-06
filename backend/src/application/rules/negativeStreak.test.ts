import { describe, expect, it } from "vitest";
import { isNegativeStreak } from "./negativeStreak.js";

describe("isNegativeStreak", () => {
  it("true если последние 3 ниже порога", () => {
    expect(isNegativeStreak([-0.7, -0.65, -0.8], -0.6, 3)).toBe(true);
  });

  it("false если мало записей", () => {
    expect(isNegativeStreak([-0.9, -0.9], -0.6, 3)).toBe(false);
  });

  it("false если одна из трёх не ниже порога", () => {
    expect(isNegativeStreak([-0.7, 0.1, -0.8], -0.6, 3)).toBe(false);
  });
});
