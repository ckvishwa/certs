import { describe, it, expect } from "vitest";
import {
  computeReadiness,
  passGate,
  type ReadinessInput,
} from "@/lib/learning/readiness";

const all = (v: number): ReadinessInput => ({
  coverage: v,
  mastery: v,
  retention: v,
  mixedPerformance: v,
  timedPerformance: v,
  mockPerformance: v,
  domainBalance: v,
  confidenceCalibration: v,
});

describe("computeReadiness", () => {
  it("scores 100 / HIGH when everything is perfect", () => {
    const r = computeReadiness(all(1));
    expect(r.score).toBe(100);
    expect(r.band).toBe("HIGH");
  });

  it("scores 0 / LOW when everything is zero", () => {
    const r = computeReadiness(all(0));
    expect(r.score).toBe(0);
    expect(r.band).toBe("LOW");
  });

  it("names the limiting factor (largest weighted shortfall)", () => {
    const r = computeReadiness({ ...all(0.9), mastery: 0.2 });
    expect(r.limitingFactor).toBe("overall mastery");
  });

  it("bands moderate in the middle", () => {
    expect(computeReadiness(all(0.7)).band).toBe("MODERATE");
  });
});

describe("passGate", () => {
  it("is ready only when evidence is strong across the board", () => {
    const res = passGate(all(0.98));
    expect(res.ready).toBe(true);
    expect(res.reasons).toHaveLength(0);
  });

  it("blocks and explains when a domain is weak", () => {
    const res = passGate({ ...all(0.98), domainBalance: 0.4 });
    expect(res.ready).toBe(false);
    expect(res.reasons.join(" ")).toMatch(/weakest domain/i);
  });
});
