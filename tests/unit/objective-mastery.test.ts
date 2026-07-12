import { describe, expect, it } from "vitest";
import {
  aggregateObjectiveMastery,
  type ObjectiveConceptSignal,
} from "@/lib/learning/objective-mastery";

const NOW = new Date("2026-07-12T12:00:00Z");

function concept(
  overrides: Partial<ObjectiveConceptSignal> = {},
): ObjectiveConceptSignal {
  return {
    id: crypto.randomUUID(),
    name: "Concept",
    mastery: 0,
    state: "UNSEEN",
    attemptCount: 0,
    nextReview: null,
    ...overrides,
  };
}

describe("aggregateObjectiveMastery", () => {
  it("keeps an objective unseen when no concept has learner evidence", () => {
    const result = aggregateObjectiveMastery([concept(), concept()], NOW);
    expect(result.state).toBe("unseen");
    expect(result.mastery).toBe(0);
  });

  it("treats an exposed concept as developing rather than unseen", () => {
    const result = aggregateObjectiveMastery(
      [concept({ state: "EXPOSED", attemptCount: 0 })],
      NOW,
    );
    expect(result.state).toBe("developing");
  });

  it("treats mixed concept mastery as developing", () => {
    const result = aggregateObjectiveMastery(
      [
        concept({ mastery: 92, state: "MASTERED", attemptCount: 8 }),
        concept({ mastery: 48, state: "RECALLING", attemptCount: 4 }),
      ],
      NOW,
    );
    expect(result.state).toBe("developing");
    expect(result.masteredConcepts).toBe(1);
    expect(result.mastery).toBe(70);
  });

  it("prioritizes review due over the numeric mastery band", () => {
    const result = aggregateObjectiveMastery(
      [
        concept({
          mastery: 90,
          state: "MASTERED",
          attemptCount: 8,
          nextReview: "2026-07-11T12:00:00Z",
        }),
      ],
      NOW,
    );
    expect(result.state).toBe("due_for_review");
    expect(result.reviewDue).toBe(true);
  });

  it("requires sustained mastery across most concepts", () => {
    const result = aggregateObjectiveMastery(
      Array.from({ length: 5 }, (_, index) =>
        concept({
          mastery: index === 4 ? 80 : 90,
          state: index === 4 ? "APPLYING" : "MASTERED",
          attemptCount: 8,
        }),
      ),
      NOW,
    );
    expect(result.state).toBe("mastered");
    expect(result.masteredConcepts).toBe(4);
  });

  it("marks repeated low evidence as weak", () => {
    const result = aggregateObjectiveMastery(
      [concept({ mastery: 18, state: "LEARNING", attemptCount: 3 })],
      NOW,
    );
    expect(result.state).toBe("weak");
    expect(result.recommendedAction).toContain("Repair");
  });
});
