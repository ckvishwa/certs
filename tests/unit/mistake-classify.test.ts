import { describe, expect, it } from "vitest";
import { classifyMistake } from "@/lib/learning/mistake-classify";

describe("classifyMistake", () => {
  it("classifies a known prerequisite gap before weaker heuristics", () => {
    expect(
      classifyMistake({
        priorState: "LEARNING",
        priorMastery: 0.5,
        confidence: "CERTAIN",
        hasPrerequisiteGap: true,
      }),
    ).toBe("PREREQUISITE_GAP");
  });

  it("treats confidently wrong as concept confusion", () => {
    expect(
      classifyMistake({
        priorState: "LEARNING",
        priorMastery: 0.5,
        confidence: "CERTAIN",
      }),
    ).toBe("CONCEPT_CONFUSION");
  });

  it("classifies an unseen or low-mastery concept as a knowledge gap", () => {
    expect(classifyMistake({ priorState: "UNSEEN", priorMastery: 0 })).toBe(
      "KNOWLEDGE_GAP",
    );
    expect(classifyMistake({ priorState: "LEARNING", priorMastery: 0.1 })).toBe(
      "KNOWLEDGE_GAP",
    );
  });

  it("uses keyword trap only for a very fast incorrect response", () => {
    expect(
      classifyMistake({
        priorState: "RECALLING",
        priorMastery: 0.6,
        responseMs: 1500,
      }),
    ).toBe("KEYWORD_TRAP");
  });

  it("leaves insufficient classification evidence unclassified", () => {
    expect(
      classifyMistake({ priorState: "RECALLING", priorMastery: 0.6 }),
    ).toBeNull();
  });
});
