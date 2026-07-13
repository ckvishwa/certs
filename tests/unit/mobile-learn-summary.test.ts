import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { buildLearnSummary } from "@/lib/mobile/learn-summary";
import { extractBearerToken, BearerAuthError } from "@/lib/supabase/bearer";

// ---------------------------------------------------------------------------
// A minimal fake Supabase query builder — just enough of the chainable API
// (select/eq/in/order/maybeSingle, plus a thenable for Promise.all) that
// getActiveStudyPlan / getCertificationsWithVersions / getKnowledgeMap
// actually exercise, so this test verifies real composition against those
// already-tested functions rather than re-testing their internals.
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

function queryBuilder(rows: Row[]) {
  let filtered = [...rows];
  const builder = {
    select: () => builder,
    eq(col: string, val: unknown) {
      filtered = filtered.filter((r) => r[col] === val);
      return builder;
    },
    in(col: string, vals: unknown[]) {
      filtered = filtered.filter((r) => vals.includes(r[col]));
      return builder;
    },
    gte(col: string, val: unknown) {
      filtered = filtered.filter((r) => (r[col] as string) >= (val as string));
      return builder;
    },
    order(col: string, opts?: { ascending?: boolean }) {
      const asc = opts?.ascending !== false;
      filtered = [...filtered].sort((a, b) => {
        const av = a[col] as string | number;
        const bv = b[col] as string | number;
        if (av === bv) return 0;
        return asc ? (av < bv ? -1 : 1) : av > bv ? -1 : 1;
      });
      return builder;
    },
    async maybeSingle() {
      return { data: filtered[0] ?? null, error: null };
    },
    async single() {
      return filtered[0]
        ? { data: filtered[0], error: null }
        : { data: null, error: { message: "not found" } };
    },
    then(resolve: (v: { data: Row[]; error: null }) => unknown) {
      return Promise.resolve({ data: filtered, error: null }).then(resolve);
    },
  };
  return builder;
}

interface Fixture {
  study_plans?: Row[];
  certifications?: Row[];
  exam_versions?: Row[];
  domains?: Row[];
  objectives?: Row[];
  concepts?: Row[];
  learner_concept_state?: Row[];
  mistakes?: Row[];
  concept_dependencies?: Row[];
  questions?: Row[];
}

function fakeDb(tables: Fixture): SupabaseClient<Database> {
  return {
    from: (table: string) =>
      queryBuilder((tables as Record<string, Row[] | undefined>)[table] ?? []),
  } as unknown as SupabaseClient<Database>;
}

const CERT = { id: "cert-1", slug: "security-plus", name: "CompTIA Security+", vendor: "CompTIA" };
const VERSION = {
  id: "version-1",
  certification_id: "cert-1",
  code: "SY0-701",
  name: "SY0-701",
  is_active: true,
  active_from: null,
};

describe("buildLearnSummary — empty user state", () => {
  it("returns safe zeroed defaults and the full catalog when there is no active study plan", async () => {
    const db = fakeDb({
      study_plans: [],
      certifications: [CERT],
      exam_versions: [VERSION],
    });

    const summary = await buildLearnSummary(db, "user-without-a-plan");

    expect(summary.activeCertification).toBeNull();
    expect(summary.progress).toEqual({
      masteredConcepts: 0,
      totalConcepts: 0,
      dueConcepts: 0,
      weakConcepts: 0,
      readinessScore: 0,
      studyStreakDays: 0,
    });
    expect(summary.nextMission).toBeNull();
    expect(summary.certifications).toHaveLength(1);
    expect(summary.certifications[0]).toMatchObject({
      id: "cert-1",
      slug: "security-plus",
      name: "CompTIA Security+",
      activeVersion: { id: "version-1", code: "SY0-701" },
    });
  });
});

describe("buildLearnSummary — populated state", () => {
  const baseFixture: Fixture = {
    study_plans: [
      {
        id: "plan-1",
        user_id: "user-a",
        certification_id: "cert-1",
        exam_version_id: "version-1",
        is_active: true,
        weekday_minutes: 30,
        weekend_minutes: 60,
        target_exam_date: null,
      },
    ],
    certifications: [CERT],
    exam_versions: [VERSION],
    domains: [{ id: "domain-1", exam_version_id: "version-1", code: "1", title: "General Security Concepts", weight: 12, position: 0 }],
    objectives: [{ id: "objective-1", domain_id: "domain-1", exam_version_id: "version-1", code: "1.1", title: "Compare security controls", is_placeholder: false, position: 0 }],
    concepts: [
      { id: "concept-mastered", objective_id: "objective-1", exam_version_id: "version-1", slug: "mastered-concept", name: "Mastered concept", is_placeholder: false, position: 0 },
      { id: "concept-unseen", objective_id: "objective-1", exam_version_id: "version-1", slug: "unseen-concept", name: "Unseen concept", is_placeholder: false, position: 1 },
    ],
    learner_concept_state: [
      {
        user_id: "user-a",
        exam_version_id: "version-1",
        concept_id: "concept-mastered",
        mastery_score: 0.95,
        state: "MASTERED",
        attempt_count: 10,
        correct_count: 9,
        incorrect_count: 1,
        next_review: null,
      },
    ],
    mistakes: [],
    concept_dependencies: [],
    questions: [],
  };

  it("reflects real knowledge-map progress and produces a next mission for user-a", async () => {
    const db = fakeDb(baseFixture);

    const summary = await buildLearnSummary(db, "user-a");

    expect(summary.activeCertification).toEqual({
      id: "version-1",
      slug: "security-plus-sy0-701",
      name: "CompTIA Security+",
      version: "SY0-701",
    });
    expect(summary.progress.totalConcepts).toBe(2);
    expect(summary.progress.masteredConcepts).toBe(1);
    expect(summary.progress.readinessScore).toBeGreaterThanOrEqual(0);
    expect(summary.progress.readinessScore).toBeLessThanOrEqual(100);
    // One unseen concept + a non-zero minute budget -> the scheduler should
    // produce at least a "new learning" task.
    expect(summary.nextMission).not.toBeNull();
    expect(summary.nextMission?.route).toBe("/today");
    expect(summary.certifications).toHaveLength(1);
  });

  it("ownership enforcement — a different user with no plan of their own sees the empty state, not user-a's data", async () => {
    const db = fakeDb(baseFixture);

    const summary = await buildLearnSummary(db, "user-b-has-no-plan");

    // getActiveStudyPlan filters by user_id internally; user-b has no row in
    // study_plans, so buildLearnSummary must fall through to the empty state
    // even though user-a's plan/progress exist in the same fixture.
    expect(summary.activeCertification).toBeNull();
    expect(summary.progress.masteredConcepts).toBe(0);
    expect(summary.progress.totalConcepts).toBe(0);
  });
});

describe("extractBearerToken — stable auth-required behavior", () => {
  it("returns null when no Authorization header is present", () => {
    const request = new Request("https://example.com/api/mobile/learn/summary");
    expect(extractBearerToken(request)).toBeNull();
  });

  it("returns null for a non-Bearer Authorization header", () => {
    const request = new Request("https://example.com/api/mobile/learn/summary", {
      headers: { Authorization: "Basic dXNlcjpwYXNz" },
    });
    expect(extractBearerToken(request)).toBeNull();
  });

  it("returns null for an empty Bearer token", () => {
    const request = new Request("https://example.com/api/mobile/learn/summary", {
      headers: { Authorization: "Bearer " },
    });
    expect(extractBearerToken(request)).toBeNull();
  });

  it("extracts the token from a well-formed Bearer header", () => {
    const request = new Request("https://example.com/api/mobile/learn/summary", {
      headers: { Authorization: "Bearer abc.def.ghi" },
    });
    expect(extractBearerToken(request)).toBe("abc.def.ghi");
  });
});

describe("BearerAuthError — stable error shape", () => {
  it("carries the UNAUTHORIZED code the route maps to the documented error body", () => {
    const error = new BearerAuthError();
    expect(error.code).toBe("UNAUTHORIZED");
    expect(error.message).toBe("Authentication required");
  });
});
