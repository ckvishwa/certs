import { clamp, type LearnerState } from "./types";

/**
 * Mastery model (§6). Mastery is NOT percent-correct. It combines recent
 * accuracy with modifiers for difficulty, retention, question diversity,
 * spacing, and application success. All weights live here so the model is
 * tunable and pinned by tests.
 */
export const MASTERY_CONFIG = {
  // How far each modifier can push mastery above/below raw recent accuracy.
  difficulty: { min: 0.75, max: 1.15, pivot: 3 }, // difficulty scale 1..5
  diversity: { min: 0.8, max: 1.0 },
  spacing: { min: 0.85, max: 1.0 },
  application: { min: 0.8, max: 1.1 },
  // Retention half-life shaping when derived from stability.
  retention: { floor: 0.0 },
} as const;

export interface MasterySignals {
  /** Correct rate over the recent window, 0..1. */
  recentAccuracy: number;
  /** Mean difficulty of recently-answered questions, 1..5. */
  avgDifficulty: number;
  /** FSRS retrievability (probability of recall now), 0..1. */
  retrievability: number;
  /** Fraction of distinct question types/skills seen, 0..1. */
  diversity: number;
  /** How well success was spaced over time rather than crammed, 0..1. */
  spacing: number;
  /** Success on APPLY/ANALYZE/TROUBLESHOOT items, 0..1. */
  application: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/** Map difficulty (1..5) to a multiplier around 1.0. */
function difficultyFactor(avgDifficulty: number): number {
  const { min, max, pivot } = MASTERY_CONFIG.difficulty;
  // 1 → min, pivot(3) → 1.0-ish, 5 → max
  const t = clamp((avgDifficulty - 1) / 4, 0, 1);
  const mid = (pivot - 1) / 4; // t at pivot
  if (t <= mid) return lerp(min, 1, t / mid);
  return lerp(1, max, (t - mid) / (1 - mid));
}

/**
 * Compute mastery score in [0,1]. Multiplicative: weak accuracy or poor
 * retention cannot be masked by other factors.
 */
export function computeMastery(signals: MasterySignals): number {
  const recent = clamp(signals.recentAccuracy, 0, 1);
  const retention = clamp(signals.retrievability, 0, 1);
  const diversity = lerp(
    MASTERY_CONFIG.diversity.min,
    MASTERY_CONFIG.diversity.max,
    signals.diversity,
  );
  const spacing = lerp(
    MASTERY_CONFIG.spacing.min,
    MASTERY_CONFIG.spacing.max,
    signals.spacing,
  );
  const application = lerp(
    MASTERY_CONFIG.application.min,
    MASTERY_CONFIG.application.max,
    signals.application,
  );

  const score =
    recent *
    difficultyFactor(signals.avgDifficulty) *
    retention *
    diversity *
    spacing *
    application;

  return clamp(score, 0, 1);
}

/**
 * Convert time-since-recall + FSRS stability into a retention factor in [0,1].
 * Uses the FSRS power forgetting curve so retrievability is consistent with the
 * scheduler.
 */
export function retentionFactor(
  stabilityDays: number,
  daysSinceRecall: number,
): number {
  if (stabilityDays <= 0) return 0;
  const DECAY = -0.5;
  const FACTOR = 19 / 81;
  const r = Math.pow(1 + (FACTOR * daysSinceRecall) / stabilityDays, DECAY);
  return clamp(r, 0, 1);
}

export interface StateSignals {
  exposureCount: number;
  attemptCount: number;
  recentAccuracy: number;
  masteryScore: number;
  retrievability: number;
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
  /** Did the learner ever demonstrate application-level success? */
  hasApplicationSuccess: boolean;
  /** Has this concept ever reached a mastered level before? */
  wasMastered: boolean;
}

export const STATE_THRESHOLDS = {
  rescueConsecutiveIncorrect: 3,
  masteredMastery: 0.85,
  masteredRetrievability: 0.85,
  decayingRetrievability: 0.6,
  applyingMastery: 0.7,
  recallingMastery: 0.55,
  learningMastery: 0.3,
  fragileMaxAttempts: 2,
} as const;

/**
 * Derive the learner state for a concept. Order matters — rescue and decay
 * checks come before positive states so a struggling learner is never labelled
 * mastered. A single correct answer can never yield MASTERED.
 */
export function deriveState(s: StateSignals): LearnerState {
  const t = STATE_THRESHOLDS;

  if (s.exposureCount === 0 && s.attemptCount === 0) return "UNSEEN";
  if (s.attemptCount === 0) return "EXPOSED";

  if (s.consecutiveIncorrect >= t.rescueConsecutiveIncorrect)
    return "NEEDS_RESCUE";

  // Previously known but retention has dropped.
  if (s.wasMastered && s.retrievability < t.decayingRetrievability)
    return "DECAYING";

  if (
    s.masteryScore >= t.masteredMastery &&
    s.retrievability >= t.masteredRetrievability &&
    s.hasApplicationSuccess
  )
    return "MASTERED";

  if (s.masteryScore >= t.applyingMastery && s.hasApplicationSuccess)
    return "APPLYING";

  if (s.masteryScore >= t.recallingMastery) return "RECALLING";

  if (s.masteryScore >= t.learningMastery) return "LEARNING";

  // Answered something recently but too few attempts to trust retention.
  if (s.attemptCount <= t.fragileMaxAttempts && s.recentAccuracy >= 0.5)
    return "FRAGILE";

  return "LEARNING";
}
