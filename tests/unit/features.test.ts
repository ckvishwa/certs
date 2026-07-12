import { describe, it, expect } from "vitest";
import { FEATURES } from "@/lib/features";

/**
 * Freeze guard: the quiz/mistakes and AI surfaces must stay disabled for the
 * Foundation release. Their route entry points (app/(app)/practice,
 * app/(app)/mistakes redirect to /today; app/api/ai/explain returns 404) all
 * key off these flags, so flipping one here without deliberately unfreezing the
 * slice would silently expose frozen functionality. This test fails loudly if
 * that happens.
 */
describe("release feature flags (frozen surfaces)", () => {
  it("keeps the quiz/mistakes surface frozen", () => {
    expect(FEATURES.quiz).toBe(false);
  });

  it("keeps the AI surface frozen", () => {
    expect(FEATURES.ai).toBe(false);
  });
});
