import { describe, it, expect } from "vitest";
import {
  newCardState,
  review,
  retrievability,
  intervalForStability,
} from "@/lib/learning/fsrs";

describe("retrievability", () => {
  it("is 1 at review time and decays with elapsed days", () => {
    expect(retrievability(10, 0)).toBeCloseTo(1, 5);
    expect(retrievability(10, 30)).toBeLessThan(retrievability(10, 5));
    expect(retrievability(10, 30)).toBeGreaterThan(0);
  });

  it("equals ~0.9 when elapsed days equals stability", () => {
    expect(retrievability(10, 10)).toBeCloseTo(0.9, 2);
  });
});

describe("intervalForStability", () => {
  it("grows with stability and is at least 1 day", () => {
    expect(intervalForStability(0.1)).toBeGreaterThanOrEqual(1);
    expect(intervalForStability(50)).toBeGreaterThan(intervalForStability(5));
  });
});

describe("review", () => {
  it("seeds a new card and schedules a future review", () => {
    const r = review(newCardState(), 3, 0);
    expect(r.reps).toBe(1);
    expect(r.stability).toBeGreaterThan(0);
    expect(r.intervalDays).toBeGreaterThanOrEqual(1);
  });

  it("gives Again a shorter interval than Good on a new card", () => {
    const again = review(newCardState(), 1, 0);
    const good = review(newCardState(), 3, 0);
    expect(again.intervalDays).toBeLessThan(good.intervalDays);
    expect(again.lapses).toBe(1);
  });

  it("gives Easy a longer interval than Good on a new card", () => {
    const good = review(newCardState(), 3, 0);
    const easy = review(newCardState(), 4, 0);
    expect(easy.intervalDays).toBeGreaterThan(good.intervalDays);
  });

  it("grows stability across repeated successful reviews", () => {
    let state = newCardState();
    let last = 0;
    for (let i = 0; i < 4; i++) {
      const elapsed = i === 0 ? 0 : intervalForStability(state.stability);
      const r = review(state, 3, elapsed);
      expect(r.stability).toBeGreaterThan(last);
      last = r.stability;
      state = r;
    }
  });

  it("shrinks stability on a lapse", () => {
    const first = review(newCardState(), 3, 0);
    const grown = review(first, 3, intervalForStability(first.stability));
    const lapsed = review(grown, 1, intervalForStability(grown.stability));
    expect(lapsed.stability).toBeLessThan(grown.stability);
    expect(lapsed.lapses).toBe(1);
  });
});
