import { clamp, type Grade } from "./types";

/**
 * FSRS-style spaced repetition (§14). A faithful-enough implementation of the
 * FSRS power forgetting curve and stability/difficulty updates. Not bit-exact
 * with the reference optimizer, but exhibits the same behaviour: Again shrinks
 * the interval, Easy grows it, retrievability decays with time, and repeated
 * success grows stability. Parameters live in FSRS_PARAMS so they can be tuned.
 */
export const FSRS_PARAMS = {
  // Initial stability (days) per grade.
  initialStability: { 1: 0.4, 2: 1.2, 3: 3.1, 4: 8.2 } as Record<Grade, number>,
  // Difficulty init and update.
  initialDifficulty: 5.0,
  difficultyGradeDelta: 1.0, // per grade step away from "Good"
  difficultyDecay: 0.0, // mean-reversion (kept simple)
  // Stability growth on successful recall.
  growthBase: 2.6,
  hardPenalty: 0.8,
  easyBonus: 1.3,
  // Stability after a lapse (Again).
  lapseFactor: 0.2,
  lapseStabilityPower: 0.4,
  // Forgetting curve.
  decay: -0.5,
  factor: 19 / 81,
  requestRetention: 0.9,
  minStability: 0.1,
  maxStability: 3650,
} as const;

export interface CardState {
  /** Memory stability in days. 0 = brand new. */
  stability: number;
  /** Difficulty 1..10. */
  difficulty: number;
  reps: number;
  lapses: number;
}

export interface ReviewResult extends CardState {
  /** Days until the card should next be reviewed. */
  intervalDays: number;
  /** Retrievability at review time (0..1); 1 for a brand-new card. */
  retrievabilityAtReview: number;
}

export function newCardState(): CardState {
  return {
    stability: 0,
    difficulty: FSRS_PARAMS.initialDifficulty,
    reps: 0,
    lapses: 0,
  };
}

/** FSRS power forgetting curve: probability of recall after `days`. */
export function retrievability(stabilityDays: number, days: number): number {
  if (stabilityDays <= 0) return days <= 0 ? 1 : 0;
  const { factor, decay } = FSRS_PARAMS;
  return clamp(Math.pow(1 + (factor * days) / stabilityDays, decay), 0, 1);
}

/** Interval (days) that yields the target retention for a given stability. */
export function intervalForStability(stabilityDays: number): number {
  const { requestRetention, factor, decay } = FSRS_PARAMS;
  const days =
    (stabilityDays * (Math.pow(requestRetention, 1 / decay) - 1)) / factor;
  return Math.max(1, Math.round(days));
}

function nextDifficulty(difficulty: number, grade: Grade): number {
  const delta = FSRS_PARAMS.difficultyGradeDelta * (3 - grade);
  return clamp(difficulty + delta, 1, 10);
}

function stabilityOnRecall(
  stability: number,
  difficulty: number,
  r: number,
  grade: Grade,
): number {
  const p = FSRS_PARAMS;
  const gradeMod =
    grade === 2 ? p.hardPenalty : grade === 4 ? p.easyBonus : 1.0;
  // Larger boost when difficulty is low, stability is low, and retrievability
  // is low (a hard-won recall strengthens memory most).
  const boost =
    1 +
    (p.growthBase / 10) *
      (11 - difficulty) *
      Math.pow(stability, -0.2) *
      (Math.exp(1 - r) - 1) *
      gradeMod;
  return clamp(stability * Math.max(1.05, boost), p.minStability, p.maxStability);
}

function stabilityOnLapse(
  stability: number,
  difficulty: number,
  r: number,
): number {
  const p = FSRS_PARAMS;
  const s =
    p.lapseFactor *
    Math.pow(difficulty, -0.2) *
    Math.pow(stability + 1, p.lapseStabilityPower) *
    Math.exp(1 - r);
  return clamp(Math.min(stability, Math.max(s, p.minStability)), p.minStability, p.maxStability);
}

/**
 * Apply a review. `elapsedDays` is the time since the last review (0 for a
 * brand-new card). Returns the updated state plus the next interval.
 */
export function review(
  state: CardState,
  grade: Grade,
  elapsedDays: number,
): ReviewResult {
  // First-ever review: seed stability/difficulty.
  if (state.reps === 0 || state.stability <= 0) {
    const stability = FSRS_PARAMS.initialStability[grade];
    const difficulty = nextDifficulty(FSRS_PARAMS.initialDifficulty, grade);
    return {
      stability,
      difficulty,
      reps: 1,
      lapses: grade === 1 ? 1 : 0,
      intervalDays: intervalForStability(stability),
      retrievabilityAtReview: 1,
    };
  }

  const r = retrievability(state.stability, Math.max(0, elapsedDays));
  const difficulty = nextDifficulty(state.difficulty, grade);
  const stability =
    grade === 1
      ? stabilityOnLapse(state.stability, difficulty, r)
      : stabilityOnRecall(state.stability, difficulty, r, grade);

  return {
    stability,
    difficulty,
    reps: state.reps + 1,
    lapses: state.lapses + (grade === 1 ? 1 : 0),
    intervalDays: intervalForStability(stability),
    retrievabilityAtReview: r,
  };
}
