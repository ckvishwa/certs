import { describe, it, expect } from "vitest";
import {
  applyAttempt,
  type ConceptSnapshot,
  type AttemptOutcome,
} from "@/lib/learning/attempt";

const fresh: ConceptSnapshot = {
  exposureCount: 0,
  attemptCount: 0,
  correctCount: 0,
  incorrectCount: 0,
  recentAccuracy: 0,
  masteryScore: 0,
  consecutiveCorrect: 0,
  consecutiveIncorrect: 0,
  wasMastered: false,
};

const correct = (difficulty = 3, skill: AttemptOutcome["skill"] = "APPLY"): AttemptOutcome => ({
  isCorrect: true,
  difficulty,
  skill,
});
const wrong: AttemptOutcome = { isCorrect: false, difficulty: 3, skill: "APPLY" };

describe("applyAttempt", () => {
  it("records a first correct attempt without declaring mastery", () => {
    const u = applyAttempt(fresh, correct());
    expect(u.attemptCount).toBe(1);
    expect(u.correctCount).toBe(1);
    expect(u.recentAccuracy).toBe(1);
    expect(u.masteryScore).toBeLessThan(0.85);
    expect(u.state).not.toBe("MASTERED");
    expect(u.consecutiveCorrect).toBe(1);
  });

  it("increments incorrect counters and streak on a wrong answer", () => {
    const u = applyAttempt(fresh, wrong);
    expect(u.incorrectCount).toBe(1);
    expect(u.consecutiveIncorrect).toBe(1);
    expect(u.recentAccuracy).toBe(0);
  });

  it("flags NEEDS_RESCUE after three consecutive wrong answers", () => {
    let snap = fresh;
    let state = "";
    for (let i = 0; i < 3; i++) {
      const u = applyAttempt(snap, wrong);
      state = u.state;
      snap = { ...snap, ...u, wasMastered: u.wasMastered };
    }
    expect(state).toBe("NEEDS_RESCUE");
  });

  it("reaches MASTERED only after sustained correct application", () => {
    let snap = fresh;
    let last = applyAttempt(snap, correct(4));
    for (let i = 0; i < 8; i++) {
      snap = { ...snap, ...last };
      last = applyAttempt(snap, correct(4));
    }
    expect(last.masteryScore).toBeGreaterThan(0.85);
    expect(last.state).toBe("MASTERED");
  });

  it("resets the correct streak when a wrong answer follows correct ones", () => {
    const first = applyAttempt(fresh, correct());
    const snap = { ...fresh, ...first };
    const second = applyAttempt(snap, wrong);
    expect(second.consecutiveCorrect).toBe(0);
    expect(second.consecutiveIncorrect).toBe(1);
    expect(second.recentAccuracy).toBeLessThan(first.recentAccuracy);
  });
});
