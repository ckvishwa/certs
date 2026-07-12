import { describe, it, expect } from "vitest";
import {
  seedCertifications,
  seedQuestions,
  conceptDependencies,
  type SeedVersion,
  type SeedDomain,
  type SeedObjective,
} from "@/supabase/seed/data.mts";

/**
 * Structural integrity tests for the seeded syllabus DATA (not the hosted
 * database). These test invariants against supabase/seed/data.mts directly —
 * the same module scripts/seed.mts consumes — so they gate content correctness
 * before anything is ever applied remotely. Codes/weights are asserted
 * explicitly against the official CompTIA SY0-701 v5.0 blueprint, not just
 * snapshotted.
 */

function findVersion(slug: string, code: string): SeedVersion {
  const cert = seedCertifications.find((c) => c.slug === slug);
  if (!cert) throw new Error(`certification not found: ${slug}`);
  const version = cert.versions.find((v) => v.code === code);
  if (!version) throw new Error(`version not found: ${slug} ${code}`);
  return version;
}

function allObjectives(version: SeedVersion): {
  domain: SeedDomain;
  objective: SeedObjective;
}[] {
  return version.domains.flatMap((domain) =>
    domain.objectives.map((objective) => ({ domain, objective })),
  );
}

function conceptCountFor(objective: SeedObjective): number {
  let count = objective.concepts?.length ?? 0;
  for (const sub of objective.subObjectives ?? []) {
    count += sub.concepts?.length ?? 0;
  }
  return count;
}

function allConceptSlugs(version: SeedVersion): string[] {
  const slugs: string[] = [];
  for (const domain of version.domains) {
    for (const objective of domain.objectives) {
      for (const c of objective.concepts ?? []) slugs.push(c.slug);
      for (const sub of objective.subObjectives ?? []) {
        for (const c of sub.concepts ?? []) slugs.push(c.slug);
      }
    }
  }
  return slugs;
}

const sy0701 = findVersion("security-plus", "SY0-701");

const EXPECTED_DOMAIN_WEIGHTS = [12, 22, 18, 28, 20];
const EXPECTED_OBJECTIVE_CODES = [
  "1.1", "1.2", "1.3", "1.4",
  "2.1", "2.2", "2.3", "2.4", "2.5",
  "3.1", "3.2", "3.3", "3.4",
  "4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "4.8", "4.9",
  "5.1", "5.2", "5.3", "5.4", "5.5", "5.6",
];

describe("Security+ SY0-701 official blueprint", () => {
  it("exists as a certification version", () => {
    expect(sy0701.name).toMatch(/Security\+/);
  });

  it("has exactly five domains", () => {
    expect(sy0701.domains).toHaveLength(5);
  });

  it("has the official domain weights in order, summing to 100", () => {
    expect(sy0701.domains.map((d) => d.weight)).toEqual(EXPECTED_DOMAIN_WEIGHTS);
    expect(sy0701.domains.reduce((sum, d) => sum + d.weight, 0)).toBe(100);
  });

  it("has no duplicate domain codes", () => {
    const codes = sy0701.domains.map((d) => d.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("has exactly 28 numbered objectives matching the official codes, in order", () => {
    const codes = allObjectives(sy0701).map(({ objective }) => objective.code);
    expect(codes).toHaveLength(28);
    expect(codes).toEqual(EXPECTED_OBJECTIVE_CODES);
  });

  it("has no duplicate objective codes within the exam version", () => {
    const codes = allObjectives(sy0701).map(({ objective }) => objective.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("assigns every objective to the domain matching its code prefix", () => {
    for (const { domain, objective } of allObjectives(sy0701)) {
      const prefix = objective.code.split(".")[0];
      expect(prefix).toBe(domain.code);
    }
  });

  it("no longer marks any SY0-701 objective as a placeholder", () => {
    for (const { objective } of allObjectives(sy0701)) {
      expect(objective.placeholder).not.toBe(true);
    }
  });

  it("gives every objective at least one meaningful atomic concept", () => {
    for (const { objective } of allObjectives(sy0701)) {
      expect(conceptCountFor(objective)).toBeGreaterThan(0);
    }
  });

  it("every sub-objective belongs to a valid parent objective with a unique code", () => {
    for (const { objective } of allObjectives(sy0701)) {
      const codes = (objective.subObjectives ?? []).map((s) => s.code);
      expect(new Set(codes).size).toBe(codes.length);
    }
  });

  it("has no duplicate concept slugs within the exam version", () => {
    const slugs = allConceptSlugs(sy0701);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("does not turn the acronym list into one concept per acronym", () => {
    // A sanity ceiling: the official acronym list has ~280 entries. Concept
    // count should be well below that, proving acronyms weren't mechanically
    // converted into standalone concepts.
    expect(allConceptSlugs(sy0701).length).toBeLessThan(150);
  });
});

describe("concept_dependencies graph integrity (all versions)", () => {
  const allSlugsEverywhere = new Set(
    seedCertifications.flatMap((cert) =>
      cert.versions.flatMap((v) => allConceptSlugs(v)),
    ),
  );

  it("every dependency and prerequisite references a real concept", () => {
    for (const [concept, prereqs] of Object.entries(conceptDependencies)) {
      expect(allSlugsEverywhere.has(concept)).toBe(true);
      for (const p of prereqs) {
        expect(allSlugsEverywhere.has(p)).toBe(true);
      }
    }
  });

  it("has no self-dependencies", () => {
    for (const [concept, prereqs] of Object.entries(conceptDependencies)) {
      expect(prereqs).not.toContain(concept);
    }
  });

  it("has no cycles", () => {
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map<string, number>();
    const visit = (node: string): boolean => {
      const state = color.get(node) ?? WHITE;
      if (state === GRAY) return true; // back-edge => cycle
      if (state === BLACK) return false;
      color.set(node, GRAY);
      for (const prereq of conceptDependencies[node] ?? []) {
        if (visit(prereq)) return true;
      }
      color.set(node, BLACK);
      return false;
    };
    for (const node of Object.keys(conceptDependencies)) {
      expect(visit(node)).toBe(false);
    }
  });
});

describe("SY0-701 curated questions", () => {
  const sy0701Slugs = new Set(allConceptSlugs(sy0701));

  it("every SY0-701 question references a concept that still exists", () => {
    const sy0701Questions = seedQuestions.filter(
      (q) => q.versionCode === "SY0-701",
    );
    expect(sy0701Questions.length).toBeGreaterThan(0);
    for (const q of sy0701Questions) {
      expect(sy0701Slugs.has(q.conceptSlug)).toBe(true);
    }
  });
});

describe("CCNA / Security+ isolation", () => {
  it("preserves all originally-seeded Security+ concept identities", () => {
    const original19 = [
      "cia-triad", "crypto-symmetric", "crypto-asymmetric", "hashing",
      "digital-signatures", "certificates", "pki", "threat-vuln-risk",
      "authentication", "mfa", "sso", "federation", "saml", "oauth", "oidc",
      "ids-ips", "incident-response", "rto-rpo", "bcp-dr",
    ];
    const slugs = new Set(allConceptSlugs(sy0701));
    for (const slug of original19) {
      expect(slugs.has(slug)).toBe(true);
    }
  });

  it("does not let CCNA and Security+ concept slugs collide", () => {
    const ccnaV11 = findVersion("ccna", "200-301 v1.1");
    const secSlugs = new Set(allConceptSlugs(sy0701));
    const ccnaSlugs = allConceptSlugs(ccnaV11);
    const overlap = ccnaSlugs.filter((s) => secSlugs.has(s));
    expect(overlap).toEqual([]);
  });

  it("leaves CCNA structure untouched (23 objectives across v1.1 + v2.0, 20 concepts)", () => {
    const ccna = seedCertifications.find((c) => c.slug === "ccna")!;
    const objectiveCount = ccna.versions.reduce(
      (sum, v) => sum + allObjectives(v).length,
      0,
    );
    const conceptCount = ccna.versions.reduce(
      (sum, v) => sum + allConceptSlugs(v).length,
      0,
    );
    expect(objectiveCount).toBe(23);
    expect(conceptCount).toBe(20);
  });
});

describe("seed rerun idempotency (data-layer)", () => {
  it("natural keys are unique, so reprocessing the same data twice cannot grow row counts", () => {
    // Objective natural key: (domain_id, code) -> approximated here as
    // (domain.code, objective.code) since domain_id is derived 1:1 from
    // domain.code within a version.
    for (const cert of seedCertifications) {
      for (const version of cert.versions) {
        const objectiveKeys = allObjectives(version).map(
          ({ domain, objective }) => `${domain.code}::${objective.code}`,
        );
        expect(new Set(objectiveKeys).size).toBe(objectiveKeys.length);

        const conceptKeys = allConceptSlugs(version);
        expect(new Set(conceptKeys).size).toBe(conceptKeys.length);
      }
    }
  });
});
