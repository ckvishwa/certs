import { describe, it, expect } from "vitest";
import { classifyMistake } from "@/lib/learning/mistake-classify";

describe("classifyMistake", () => {
  it("treats confidently-wrong as a misconception (CONFUSION)", () => {
    expect(
      classifyMistake({
        priorState: "LEARNING",
        priorMastery: 0.5,
        confidence: "CERTAIN",
      }),
    ).toBe("CONFUSION");
  });

  it("classifies a forgotten mastered concept as MEMORY_FAILURE", () => {
    expect(
      classifyMistake({ priorState: "MASTERED", priorMastery: 0.9 }),
    ).toBe("MEMORY_FAILURE");
  });

  it("classifies an unseen/low-mastery concept as KNOWLEDGE_GAP", () => {
    expect(classifyMistake({ priorState: "UNSEEN", priorMastery: 0 })).toBe(
      "KNOWLEDGE_GAP",
    );
    expect(
      classifyMistake({ priorState: "LEARNING", priorMastery: 0.1 }),
    ).toBe("KNOWLEDGE_GAP");
  });

  it("classifies command questions with decent mastery as COMMAND_SYNTAX", () => {
    expect(
      classifyMistake({
        priorState: "RECALLING",
        priorMastery: 0.6,
        questionKind: "COMMAND",
      }),
    ).toBe("COMMAND_SYNTAX");
  });

  it("flags very fast wrong answers as READING_ERROR", () => {
    expect(
      classifyMistake({
        priorState: "RECALLING",
        priorMastery: 0.6,
        responseMs: 1500,
      }),
    ).toBe("READING_ERROR");
  });

  it("flags very slow wrong answers as TIME_PRESSURE", () => {
    expect(
      classifyMistake({
        priorState: "RECALLING",
        priorMastery: 0.6,
        responseMs: 120000,
      }),
    ).toBe("TIME_PRESSURE");
  });
});
