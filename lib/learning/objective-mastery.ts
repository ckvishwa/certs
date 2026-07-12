import type { LearnerState } from "@/lib/types/database";

export type ObjectiveMasteryState =
  "unseen" | "weak" | "developing" | "mastered" | "due_for_review";

export interface ObjectiveConceptSignal {
  id: string;
  name: string;
  mastery: number;
  state: LearnerState;
  attemptCount: number;
  nextReview: string | null;
}

export interface ObjectiveMasterySummary {
  state: ObjectiveMasteryState;
  mastery: number;
  masteredConcepts: number;
  totalConcepts: number;
  reviewDue: boolean;
  dueConcepts: number;
  weakConcepts: ObjectiveConceptSignal[];
  recommendedAction: string;
}

const WEAK_STATES = new Set<LearnerState>([
  "FRAGILE",
  "LEARNING",
  "NEEDS_RESCUE",
]);

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isDue(concept: ObjectiveConceptSignal, now: Date): boolean {
  if (concept.state === "DECAYING") return true;
  return concept.nextReview !== null && new Date(concept.nextReview) <= now;
}

export function aggregateObjectiveMastery(
  concepts: ObjectiveConceptSignal[],
  now = new Date(),
): ObjectiveMasterySummary {
  const totalConcepts = concepts.length;
  const mastery = average(concepts.map((concept) => concept.mastery));
  const masteredConcepts = concepts.filter(
    (concept) => concept.state === "MASTERED",
  ).length;
  const observed = concepts.filter(
    (concept) => concept.state !== "UNSEEN" || concept.attemptCount > 0,
  );
  const attempted = concepts.filter((concept) => concept.attemptCount > 0);
  const dueConcepts = concepts.filter((concept) => isDue(concept, now)).length;
  const weakConcepts = concepts
    .filter(
      (concept) =>
        concept.attemptCount > 0 &&
        (WEAK_STATES.has(concept.state) || concept.mastery < 30),
    )
    .sort((a, b) => a.mastery - b.mastery);

  let state: ObjectiveMasteryState;
  if (totalConcepts === 0 || observed.length === 0) {
    state = "unseen";
  } else if (dueConcepts > 0) {
    state = "due_for_review";
  } else if (mastery >= 85 && masteredConcepts / totalConcepts >= 0.8) {
    state = "mastered";
  } else {
    const attemptedMastery = average(
      attempted.map((concept) => concept.mastery),
    );
    const weakShare =
      attempted.length > 0 ? weakConcepts.length / attempted.length : 0;
    state =
      attempted.length > 0 && (attemptedMastery < 30 || weakShare >= 0.5)
        ? "weak"
        : "developing";
  }

  const weakest = weakConcepts[0] ?? attempted[0] ?? concepts[0];
  const recommendedAction = (() => {
    switch (state) {
      case "unseen":
        return weakest
          ? `Start with ${weakest.name}.`
          : "Start this objective.";
      case "due_for_review":
        return `Review ${dueConcepts} due concept${dueConcepts === 1 ? "" : "s"}.`;
      case "weak":
        return weakest
          ? `Repair ${weakest.name} first.`
          : "Repair the weakest concept.";
      case "developing":
        return weakest
          ? `Practice ${weakest.name} in context.`
          : "Continue applied practice.";
      case "mastered":
        return "Use mixed recall to maintain mastery.";
    }
  })();

  return {
    state,
    mastery,
    masteredConcepts,
    totalConcepts,
    reviewDue: dueConcepts > 0,
    dueConcepts,
    weakConcepts,
    recommendedAction,
  };
}
