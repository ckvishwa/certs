import { describe, it, expect } from "vitest";
import {
  generateDailyMission,
  SCHEDULER_CONFIG,
  type WeakConcept,
  type MissionInput,
} from "@/lib/learning/scheduler";

const weak = (over: Partial<WeakConcept>): WeakConcept => ({
  conceptId: "c1",
  name: "OSPF neighbors",
  state: "LEARNING",
  masteryScore: 0.4,
  domainWeight: 0.3,
  ...over,
});

describe("generateDailyMission", () => {
  it("never exceeds the available time budget", () => {
    const input: MissionInput = {
      availableMinutes: 47,
      dueReviewCount: 14,
      weakConcepts: [weak({}), weak({ conceptId: "c2" })],
      newConceptsAvailable: 5,
    };
    const m = generateDailyMission(input);
    expect(m.totalMinutes).toBeLessThanOrEqual(47);
    expect(m.tasks.length).toBeGreaterThan(0);
  });

  it("prioritises a NEEDS_RESCUE concept first", () => {
    const m = generateDailyMission({
      availableMinutes: 60,
      dueReviewCount: 5,
      weakConcepts: [
        weak({ conceptId: "ok", state: "LEARNING", masteryScore: 0.5 }),
        weak({
          conceptId: "bad",
          name: "STP roles",
          state: "NEEDS_RESCUE",
          masteryScore: 0.2,
        }),
      ],
      newConceptsAvailable: 0,
    });
    expect(m.tasks[0].type).toBe("WEAK_REPAIR");
    expect(m.tasks[0].payload.conceptId).toBe("bad");
  });

  it("caps a large review backlog and reports the deferral", () => {
    const budget = 60;
    const m = generateDailyMission({
      availableMinutes: budget,
      dueReviewCount: 500,
      weakConcepts: [weak({})],
      newConceptsAvailable: 0,
    });
    const reviewTask = m.tasks.find((t) => t.type === "FLASHCARDS");
    expect(reviewTask).toBeDefined();
    expect(reviewTask!.estimatedMinutes).toBeLessThanOrEqual(
      Math.floor(budget * SCHEDULER_CONFIG.reviewBudgetShare),
    );
    expect(m.deferred.reviewsDeferred).toBeGreaterThan(0);
  });

  it("returns no tasks when there is no time", () => {
    const m = generateDailyMission({
      availableMinutes: 0,
      dueReviewCount: 10,
      weakConcepts: [weak({})],
      newConceptsAvailable: 3,
    });
    expect(m.tasks).toHaveLength(0);
    expect(m.totalMinutes).toBe(0);
  });
});
