import type { LearnerState, TaskType } from "@/lib/types/database";

/**
 * Daily study scheduler (§9, §10). Given available minutes and the current
 * learner picture, produce an ordered mission that fits the time budget,
 * prioritising weakness rescue and due reviews. On a large review backlog it
 * REBALANCES (caps review time) rather than stacking an impossible day, and
 * reports what it deferred.
 */

export interface WeakConcept {
  conceptId: string;
  name: string;
  state: LearnerState;
  masteryScore: number;
  domainWeight: number; // blueprint weight of its domain (0..1)
}

export interface MissionInput {
  availableMinutes: number;
  dueReviewCount: number;
  weakConcepts: WeakConcept[]; // caller may pass unsorted
  newConceptsAvailable: number;
}

export interface GeneratedTask {
  type: TaskType;
  title: string;
  reason: string;
  estimatedMinutes: number;
  payload: Record<string, unknown>;
}

export interface GeneratedMission {
  tasks: GeneratedTask[];
  totalMinutes: number;
  deferred: { reviewsDeferred: number };
}

export const SCHEDULER_CONFIG = {
  minutesPerReview: 0.5, // ~30s per due card
  reviewBudgetShare: 0.4, // reviews never exceed this share of the day
  rescueMinutes: 12,
  mixedQuizMinutes: 15,
  newLearningMinutes: 12,
  minTaskMinutes: 4,
} as const;

const RESCUE_STATES: LearnerState[] = ["NEEDS_RESCUE", "DECAYING", "FRAGILE"];

/** Worst-first: rescue states first, then lowest mastery, then domain weight. */
function rankWeak(a: WeakConcept, b: WeakConcept): number {
  const ar = RESCUE_STATES.indexOf(a.state);
  const br = RESCUE_STATES.indexOf(b.state);
  const aRank = ar === -1 ? RESCUE_STATES.length : ar;
  const bRank = br === -1 ? RESCUE_STATES.length : br;
  if (aRank !== bRank) return aRank - bRank;
  if (a.masteryScore !== b.masteryScore) return a.masteryScore - b.masteryScore;
  return b.domainWeight - a.domainWeight;
}

export function generateDailyMission(input: MissionInput): GeneratedMission {
  const cfg = SCHEDULER_CONFIG;
  const budget = Math.max(0, Math.round(input.availableMinutes));
  const tasks: GeneratedTask[] = [];
  let remaining = budget;

  const weak = [...input.weakConcepts].sort(rankWeak);

  // 1) Weakness rescue — the single worst concept, if any.
  const worst = weak[0];
  if (worst && remaining >= cfg.minTaskMinutes) {
    const minutes = Math.min(cfg.rescueMinutes, remaining);
    tasks.push({
      type: "WEAK_REPAIR",
      title: `Rescue: ${worst.name}`,
      reason: reasonForWeak(worst),
      estimatedMinutes: minutes,
      payload: { conceptId: worst.conceptId, state: worst.state },
    });
    remaining -= minutes;
  }

  // 2) Due reviews — capped so a backlog can't consume the whole day.
  let reviewsDeferred = 0;
  if (input.dueReviewCount > 0 && remaining >= cfg.minTaskMinutes) {
    const wanted = Math.ceil(input.dueReviewCount * cfg.minutesPerReview);
    const cap = Math.floor(budget * cfg.reviewBudgetShare);
    const minutes = Math.min(wanted, cap, remaining);
    const cardsCovered = Math.floor(minutes / cfg.minutesPerReview);
    reviewsDeferred = Math.max(0, input.dueReviewCount - cardsCovered);
    if (minutes >= cfg.minTaskMinutes) {
      tasks.push({
        type: "FLASHCARDS",
        title: `Review ${cardsCovered} due cards`,
        reason:
          reviewsDeferred > 0
            ? `${input.dueReviewCount} cards due; scheduling ${cardsCovered} today to keep the session balanced.`
            : `${input.dueReviewCount} cards are due for review.`,
        estimatedMinutes: minutes,
        payload: { dueCards: cardsCovered },
      });
      remaining -= minutes;
    } else {
      reviewsDeferred = input.dueReviewCount;
    }
  }

  // 3) Mixed quiz to consolidate, if time remains.
  if (remaining >= cfg.minTaskMinutes && weak.length > 0) {
    const minutes = Math.min(cfg.mixedQuizMinutes, remaining);
    tasks.push({
      type: "MIXED_QUIZ",
      title: "Mixed exam sprint",
      reason: "Interleaved questions across your active domains.",
      estimatedMinutes: minutes,
      payload: {
        conceptIds: weak.slice(0, 8).map((w) => w.conceptId),
      },
    });
    remaining -= minutes;
  }

  // 4) New learning with any leftover time.
  if (remaining >= cfg.minTaskMinutes && input.newConceptsAvailable > 0) {
    const minutes = Math.min(cfg.newLearningMinutes, remaining);
    tasks.push({
      type: "NEW_LEARNING",
      title: "Learn something new",
      reason: `${input.newConceptsAvailable} concepts you haven't started yet.`,
      estimatedMinutes: minutes,
      payload: {},
    });
    remaining -= minutes;
  }

  return {
    tasks,
    totalMinutes: tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0),
    deferred: { reviewsDeferred },
  };
}

function reasonForWeak(w: WeakConcept): string {
  switch (w.state) {
    case "NEEDS_RESCUE":
      return `You've repeatedly missed ${w.name}. Time to fix the root cause.`;
    case "DECAYING":
      return `You knew ${w.name} before but retention is slipping.`;
    case "FRAGILE":
      return `${w.name} is recent but not yet reliable.`;
    default:
      return `${w.name} is your lowest-mastery active concept.`;
  }
}
