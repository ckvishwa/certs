import { describe, expect, it } from "vitest";
import {
  aggregateMistakeHeatmap,
  isMistakeTaxonomy,
} from "@/lib/learning/mistake-heatmap";

describe("mistake heatmap aggregation", () => {
  const objectives = [
    { id: "one", code: "1.1", title: "Security controls" },
    { id: "two", code: "1.2", title: "Threat actors" },
  ];

  it("counts exact classifications by objective", () => {
    const rows = aggregateMistakeHeatmap(objectives, [
      {
        id: "m1",
        objectiveId: "one",
        conceptName: null,
        questionStem: null,
        type: "KNOWLEDGE_GAP",
        createdAt: "2026-07-10T00:00:00Z",
      },
      {
        id: "m2",
        objectiveId: "one",
        conceptName: null,
        questionStem: null,
        type: "CONCEPT_CONFUSION",
        createdAt: "2026-07-11T00:00:00Z",
      },
    ]);
    expect(rows[0].counts.KNOWLEDGE_GAP).toBe(1);
    expect(rows[0].counts.CONCEPT_CONFUSION).toBe(1);
    expect(rows[1].total).toBe(0);
  });

  it("does not treat missing or legacy classifications as taxonomy data", () => {
    expect(isMistakeTaxonomy(null)).toBe(false);
    expect(isMistakeTaxonomy("CONFUSION")).toBe(false);
    expect(isMistakeTaxonomy("SCOPE_ERROR")).toBe(true);
  });
});
