import { clamp } from "./types";

/**
 * Exam readiness estimate (§30, §31). Produces a 0–100 internal estimate — a
 * band, explicitly labelled an estimate, never a promise — and always names the
 * limiting factor so it's actionable. A separate pass gate only recommends
 * booking when evidence is strong.
 */

export interface ReadinessInput {
  coverage: number; // fraction of syllabus seen, 0..1
  mastery: number; // mean mastery of active concepts, 0..1
  retention: number; // mean retrievability, 0..1
  mixedPerformance: number; // accuracy on interleaved questions, 0..1
  timedPerformance: number; // accuracy under time pressure, 0..1
  mockPerformance: number; // recent mock exam score, 0..1
  domainBalance: number; // mastery of the WEAKEST domain, 0..1
  confidenceCalibration: number; // how well confidence matches correctness, 0..1
}

export const READINESS_WEIGHTS: Record<keyof ReadinessInput, number> = {
  coverage: 0.16,
  mastery: 0.2,
  retention: 0.16,
  mixedPerformance: 0.12,
  timedPerformance: 0.12,
  mockPerformance: 0.12,
  domainBalance: 0.08,
  confidenceCalibration: 0.04,
};

const LABELS: Record<keyof ReadinessInput, string> = {
  coverage: "syllabus coverage",
  mastery: "overall mastery",
  retention: "retention",
  mixedPerformance: "mixed-question performance",
  timedPerformance: "timed performance",
  mockPerformance: "mock exam performance",
  domainBalance: "weakest domain",
  confidenceCalibration: "confidence calibration",
};

export type ReadinessBand = "LOW" | "MODERATE" | "HIGH";

export interface ReadinessResult {
  score: number; // 0..100
  band: ReadinessBand;
  limitingFactor: string; // human-readable weakest component
  components: Record<keyof ReadinessInput, number>; // each 0..1
}

export function computeReadiness(input: ReadinessInput): ReadinessResult {
  const keys = Object.keys(READINESS_WEIGHTS) as (keyof ReadinessInput)[];
  const components = {} as Record<keyof ReadinessInput, number>;
  let weighted = 0;
  for (const key of keys) {
    const v = clamp(input[key], 0, 1);
    components[key] = v;
    weighted += v * READINESS_WEIGHTS[key];
  }

  const score = Math.round(clamp(weighted, 0, 1) * 100);

  // Limiting factor = component with the largest weighted shortfall.
  let worstKey = keys[0];
  let worstShortfall = -Infinity;
  for (const key of keys) {
    const shortfall = (1 - components[key]) * READINESS_WEIGHTS[key];
    if (shortfall > worstShortfall) {
      worstShortfall = shortfall;
      worstKey = key;
    }
  }

  const band: ReadinessBand = score >= 80 ? "HIGH" : score >= 60 ? "MODERATE" : "LOW";

  return { score, band, limitingFactor: LABELS[worstKey], components };
}

export const PASS_GATE_CONFIG = {
  minScore: 80,
  minCoverage: 0.95,
  minDomainBalance: 0.7,
  minMock: 0.8,
  minRetention: 0.75,
} as const;

export interface PassGateResult {
  ready: boolean;
  reasons: string[];
}

/**
 * Only recommend booking the exam when the evidence is strong across the board.
 * Never guarantees a pass — returns the specific blockers when not ready.
 */
export function passGate(input: ReadinessInput): PassGateResult {
  const r = computeReadiness(input);
  const c = PASS_GATE_CONFIG;
  const reasons: string[] = [];

  if (r.score < c.minScore)
    reasons.push(`Readiness estimate ${r.score} is below ${c.minScore}.`);
  if (input.coverage < c.minCoverage)
    reasons.push(`Syllabus coverage ${pct(input.coverage)} is below ${pct(c.minCoverage)}.`);
  if (input.domainBalance < c.minDomainBalance)
    reasons.push(`Weakest domain ${pct(input.domainBalance)} is below ${pct(c.minDomainBalance)}.`);
  if (input.mockPerformance < c.minMock)
    reasons.push(`Mock performance ${pct(input.mockPerformance)} is below ${pct(c.minMock)}.`);
  if (input.retention < c.minRetention)
    reasons.push(`Retention ${pct(input.retention)} is below ${pct(c.minRetention)}.`);

  return { ready: reasons.length === 0, reasons };
}

function pct(v: number): string {
  return `${Math.round(clamp(v, 0, 1) * 100)}%`;
}
