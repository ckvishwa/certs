import { clamp } from "./types";
import { deriveState } from "./mastery";
import type { CognitiveSkill, LearnerState } from "@/lib/types/database";

/**
 * Applies a single question attempt to a concept's learner state. Pure — takes
 * the prior snapshot + the outcome and returns the fields to persist. Mastery
 * ramps with attempt volume so one correct answer can never reach MASTERED.
 */
export const ATTEMPT_CONFIG = {
  recentAlpha: 0.4, // EMA weight for the newest result
  volumeTarget: 6, // attempts needed for full mastery confidence
  volumeFloor: 0.4,
  difficultyPivot: 3,
  difficultyStep: 0.05,
  difficultyMin: 0.8,
  difficultyMax: 1.15,
} as const;

const APPLICATION_SKILLS: CognitiveSkill[] = [
  "APPLY",
  "ANALYZE",
  "TROUBLESHOOT",
];

export interface ConceptSnapshot {
  exposureCount: number;
  attemptCount: number;
  correctCount: number;
  incorrectCount: number;
  recentAccuracy: number;
  masteryScore: number;
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
  wasMastered: boolean;
}

export interface AttemptOutcome {
  isCorrect: boolean;
  difficulty: number; // 1..5
  skill: CognitiveSkill;
}

export interface ConceptUpdate {
  exposureCount: number;
  attemptCount: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  recentAccuracy: number;
  masteryScore: number;
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
  state: LearnerState;
  wasMastered: boolean;
}

function difficultyFactor(difficulty: number): number {
  const c = ATTEMPT_CONFIG;
  return clamp(
    1 + (difficulty - c.difficultyPivot) * c.difficultyStep,
    c.difficultyMin,
    c.difficultyMax,
  );
}

export function applyAttempt(
  snap: ConceptSnapshot,
  outcome: AttemptOutcome,
): ConceptUpdate {
  const c = ATTEMPT_CONFIG;
  const correct = outcome.isCorrect;

  const attemptCount = snap.attemptCount + 1;
  const correctCount = snap.correctCount + (correct ? 1 : 0);
  const incorrectCount = snap.incorrectCount + (correct ? 0 : 1);
  const accuracy = correctCount / attemptCount;

  const recentAccuracy =
    snap.attemptCount === 0
      ? correct
        ? 1
        : 0
      : clamp(
          snap.recentAccuracy * (1 - c.recentAlpha) +
            (correct ? 1 : 0) * c.recentAlpha,
          0,
          1,
        );

  const consecutiveCorrect = correct ? snap.consecutiveCorrect + 1 : 0;
  const consecutiveIncorrect = correct ? 0 : snap.consecutiveIncorrect + 1;

  const volumeFactor = clamp(attemptCount / c.volumeTarget, c.volumeFloor, 1);
  const masteryScore = clamp(
    recentAccuracy * difficultyFactor(outcome.difficulty) * volumeFactor,
    0,
    1,
  );

  const hasApplicationSuccess =
    correct && APPLICATION_SKILLS.includes(outcome.skill);
  // Freshly practised: retrievability is high right after a correct recall.
  const retrievability = correct ? 0.9 : 0.5;

  const state = deriveState({
    exposureCount: Math.max(snap.exposureCount, 1),
    attemptCount,
    recentAccuracy,
    masteryScore,
    retrievability,
    consecutiveCorrect,
    consecutiveIncorrect,
    hasApplicationSuccess,
    wasMastered: snap.wasMastered,
  });

  return {
    exposureCount: Math.max(snap.exposureCount, 1),
    attemptCount,
    correctCount,
    incorrectCount,
    accuracy,
    recentAccuracy,
    masteryScore,
    consecutiveCorrect,
    consecutiveIncorrect,
    state,
    wasMastered: snap.wasMastered || state === "MASTERED",
  };
}
