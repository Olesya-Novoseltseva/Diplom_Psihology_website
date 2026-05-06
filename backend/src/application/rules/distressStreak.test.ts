import { describe, expect, it } from "vitest";
import { isDistressStreak } from "./distressStreak.js";

describe("isDistressStreak", () => {
  it("returns false when not enough entries", () => {
    expect(isDistressStreak([0.7, 0.7], 0.58, 3)).toBe(false);
  });

  it("detects streak from newest first", () => {
    expect(isDistressStreak([0.6, 0.6, 0.6, 0.2], 0.58, 3)).toBe(true);
    expect(isDistressStreak([0.5, 0.6, 0.6, 0.6], 0.58, 3)).toBe(false);
  });
});
