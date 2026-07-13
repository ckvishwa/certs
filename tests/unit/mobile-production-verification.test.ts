import { describe, expect, it } from "vitest";
import { GET as health } from "@/app/api/mobile/health/route";
import {
  validateCatalog,
  validateCertification,
  validateHealth,
} from "@/lib/mobile/production-verification";
import {
  buildMobileCurriculum,
  buildMobileCurriculumCatalog,
} from "@/lib/mobile/curriculum";

describe("mobile production verification", () => {
  it("accepts the committed public curriculum contract", async () => {
    validateCatalog(buildMobileCurriculumCatalog());
    validateCertification(
      buildMobileCurriculum("security-plus-sy0-701"),
      "securityPlus",
    );
    validateCertification(buildMobileCurriculum("ccna"), "ccna");
    validateHealth(await health().json());
  });

  it("rejects sensitive-looking fields and count mismatches", () => {
    expect(() =>
      validateCatalog({
        schemaVersion: 1,
        certifications: [{ slug: "ccna" }, { slug: "security-plus-sy0-701" }],
        token: "redacted",
      }),
    ).toThrow("sensitive-looking");
    expect(() =>
      validateCertification(
        {
          schemaVersion: 1,
          certification: {
            slug: "ccna",
            versions: [],
            counts: { objectives: 1, concepts: 20 },
          },
        },
        "ccna",
      ),
    ).toThrow("CCNA versions");
  });
});
