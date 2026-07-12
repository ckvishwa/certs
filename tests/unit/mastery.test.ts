import { describe, it, expect } from "vitest";
import {
  computeMastery,
  deriveState,
  retentionFactor,
  type MasterySignals,
  type StateSignals,
} from "@/lib/learning/mastery";

const perfect: MasterySignals = {
  recentAccuracy: 1,
  avgDifficulty: 5,
  retrievability: 1,
  diversity: 1,
  spacing: 1,
  application: 1,
};

describe("computeMastery", () => {
  it("rewards strong, hard, well-retained, diverse performance", () => {
    expect(computeMastery(perfect)).toBeGreaterThan(0.95);
  });

  it("returns 0 when accuracy is 0", () => {
    expect(computeMastery({ ...perfect, recentAccuracy: 0 })).toBe(0);
  });

  it("collapses to 0 when nothing is retained (multiplicative)", () => {
    expect(computeMastery({ ...perfect, retrievability: 0 })).toBe(0);
  });

  it("penalises easy-only, crammed practice below raw accuracy", () => {
    const weak = computeMastery({
      recentAccuracy: 0.9,
      avgDifficulty: 1,
      retrievability: 0.9,
      diversity: 0,
      spacing: 0,
      application: 0,
    });
    expect(weak).toBeLessThan(0.9);
  });
});

describe("retentionFactor", () => {
  it("is 1.0 at t=0 and decays over time", () => {
    expect(retentionFactor(10, 0)).toBeCloseTo(1, 5);
    expect(retentionFactor(10, 10)).toBeGreaterThan(0);
    expect(retentionFactor(10, 10)).toBeLessThan(retentionFactor(10, 1));
  });

  it("is 0 with no stability", () => {
    expect(retentionFactor(0, 5)).toBe(0);
  });
});

describe("deriveState", () => {
  const base: StateSignals = {
    exposureCount: 5,
    attemptCount: 5,
    recentAccuracy: 0.8,
    masteryScore: 0.5,
    retrievability: 0.8,
    consecutiveCorrect: 2,
    consecutiveIncorrect: 0,
    hasApplicationSuccess: false,
    wasMastered: false,
  };

  it("is UNSEEN before any exposure", () => {
    expect(
      deriveState({ ...base, exposureCount: 0, attemptCount: 0 }),
    ).toBe("UNSEEN");
  });

  it("is EXPOSED after reading but before attempting", () => {
    expect(deriveState({ ...base, attemptCount: 0 })).toBe("EXPOSED");
  });

  it("flags NEEDS_RESCUE after repeated failures", () => {
    expect(
      deriveState({ ...base, consecutiveIncorrect: 3, masteryScore: 0.9 }),
    ).toBe("NEEDS_RESCUE");
  });

  it("never returns MASTERED without application success", () => {
    const s = deriveState({
      ...base,
      masteryScore: 0.95,
      retrievability: 0.95,
      hasApplicationSuccess: false,
    });
    expect(s).not.toBe("MASTERED");
  });

  it("returns MASTERED with high mastery, retention, and application", () => {
    expect(
      deriveState({
        ...base,
        masteryScore: 0.95,
        retrievability: 0.95,
        hasApplicationSuccess: true,
      }),
    ).toBe("MASTERED");
  });

  it("flags DECAYING when a once-mastered concept loses retention", () => {
    expect(
      deriveState({
        ...base,
        wasMastered: true,
        retrievability: 0.4,
        masteryScore: 0.7,
      }),
    ).toBe("DECAYING");
  });

  it("does not treat one correct answer as mastery", () => {
    const s = deriveState({
      exposureCount: 1,
      attemptCount: 1,
      recentAccuracy: 1,
      masteryScore: 0.3,
      retrievability: 0.5,
      consecutiveCorrect: 1,
      consecutiveIncorrect: 0,
      hasApplicationSuccess: false,
      wasMastered: false,
    });
    expect(["FRAGILE", "LEARNING"]).toContain(s);
  });
});
