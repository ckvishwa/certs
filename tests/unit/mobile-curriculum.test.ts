import { describe, expect, it } from "vitest";
import {
  buildMobileCurriculum,
  buildMobileCurriculumCatalog,
} from "@/lib/mobile/curriculum";

describe("mobile curriculum contract", () => {
  it("exports the complete, ordered Security+ SY0-701 structure", () => {
    const detail = buildMobileCurriculum("security-plus-sy0-701")!;
    const version = detail.certification.versions.find((item) => item.isActive)!;
    expect(detail.schemaVersion).toBe(1);
    expect(detail.certification.status).toBe("complete");
    expect(version.counts).toEqual({ domains: 5, objectives: 28, subObjectives: 38, concepts: 98, dependencies: 36 });
    expect(version.domains.map((domain) => domain.number)).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("labels incomplete CCNA coverage without leaking learner data", () => {
    const detail = buildMobileCurriculum("ccna")!;
    expect(detail.certification.status).toBe("coverage_in_progress");
    expect(detail.certification.versions).toHaveLength(2);
    expect(detail.certification.counts.objectives).toBe(23);
    expect(detail.certification.counts.concepts).toBe(20);
    expect(JSON.stringify(detail)).not.toContain("mastery");
    expect(JSON.stringify(detail)).not.toContain("user_id");
  });

  it("has stable catalog ordering and null for invalid slugs", () => {
    const catalog = buildMobileCurriculumCatalog();
    expect(catalog.certifications.map((item) => item.slug)).toEqual(["ccna", "security-plus-sy0-701"]);
    expect(buildMobileCurriculum("unknown")).toBeNull();
  });
});
