import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, LearnerState } from "@/lib/types/database";
import { getCertificationsWithVersions } from "@/lib/db/certifications";
import { getKnowledgeMap, type KMConcept } from "@/lib/db/knowledge-map";
import { getActiveStudyPlan } from "@/lib/db/study-plan";
import { computeReadiness } from "@/lib/learning/readiness";
import { buildMobileCurriculum } from "@/lib/mobile/curriculum";

const WEAK_STATES = new Set<LearnerState>([
  "NEEDS_RESCUE",
  "DECAYING",
  "FRAGILE",
]);
type DB = SupabaseClient<Database>;

export type OwnerLearningState = {
  schemaVersion: 1;
  generatedAt: string;
  owner: { displayName: string | null };
  summary: {
    readinessPercent: number;
    currentStreakDays: number;
    masteredConcepts: number;
    totalTrackedConcepts: number;
    dueConceptCount: number;
    weakConceptCount: number;
  };
  certifications: Array<{
    slug: string;
    name: string;
    readinessPercent: number;
    masteredConcepts: number;
    totalConcepts: number;
    dueConceptCount: number;
    weakConceptCount: number;
  }>;
  weakConcepts: OwnerConcept[];
  dueConcepts: OwnerDueConcept[];
  nextMission: OwnerMission;
};

type OwnerConcept = {
  conceptId: string;
  certificationSlug: string;
  title: string;
  masteryPercent: number;
  reason: string;
};
type OwnerDueConcept = Omit<OwnerConcept, "reason"> & { dueAt: string };
type OwnerMission = {
  type: "review_concept" | "learn_concept";
  certificationSlug: string;
  conceptId: string;
  title: string;
  reason: string;
};

function allConcepts(
  map: Awaited<ReturnType<typeof getKnowledgeMap>>,
): KMConcept[] {
  return map.domains.flatMap((domain) =>
    domain.objectives.flatMap((objective) => objective.concepts),
  );
}

function certificationSlug(
  certificationSlug: string,
  versionCode: string,
): string {
  return `${certificationSlug}-${versionCode.toLowerCase()}`;
}

function missionFor(
  concepts: KMConcept[],
  slug: string,
  certificationBaseSlug: string,
  versionCode: string,
  now: Date,
): OwnerMission {
  const due = concepts
    .filter(
      (concept) => concept.nextReview && new Date(concept.nextReview) <= now,
    )
    .sort((a, b) => a.mastery - b.mastery || a.name.localeCompare(b.name));
  const weak = concepts
    .filter((concept) => WEAK_STATES.has(concept.state))
    .sort((a, b) => a.mastery - b.mastery || a.name.localeCompare(b.name));
  const overdueWeak = due.find((concept) => WEAK_STATES.has(concept.state));
  const selected =
    overdueWeak ??
    due[0] ??
    weak[0] ??
    concepts.find((concept) => concept.state === "UNSEEN") ??
    concepts[0];
  if (!selected) {
    return {
      type: "learn_concept",
      certificationSlug: "security-plus-sy0-701",
      conceptId: "security-plus:SY0-701:concept:control-categories",
      title: "Start Security+",
      reason: "No persisted learner state exists yet.",
    };
  }
  const reason = overdueWeak
    ? "Overdue and currently weak."
    : due[0]
      ? "Due now with the lowest mastery."
      : weak[0]
        ? "Lowest-mastery weak concept."
        : "Next incomplete concept in your active certification.";
  return {
    type: due.includes(selected) ? "review_concept" : "learn_concept",
    certificationSlug: slug,
    // This is the same stable curriculum identifier bundled by REVA, not a
    // database UUID. The private API never exposes a table identifier to the
    // phone and the app can open the native concept without a lookup.
    conceptId: `${certificationBaseSlug === "security-plus" ? "security-plus:SY0-701" : `ccna:${versionCode}`}:concept:${selected.slug}`,
    title: `${due.includes(selected) ? "Review" : "Learn"}: ${selected.name}`,
    reason,
  };
}

/** Builds the private API contract from the canonical knowledge-map/readiness data. */
export async function buildOwnerLearningState(
  db: DB,
  ownerUserId: string,
): Promise<OwnerLearningState> {
  const [profileResult, plan, catalog] = await Promise.all([
    db
      .from("profiles")
      .select("display_name")
      .eq("id", ownerUserId)
      .maybeSingle(),
    getActiveStudyPlan(db, ownerUserId),
    getCertificationsWithVersions(db),
  ]);
  const displayName = profileResult.data?.display_name ?? null;
  if (!plan) {
    const curriculum = buildMobileCurriculum("security-plus-sy0-701");
    const total = curriculum?.certification.counts.concepts ?? 0;
    return {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      owner: { displayName },
      summary: {
        readinessPercent: 0,
        currentStreakDays: 0,
        masteredConcepts: 0,
        totalTrackedConcepts: total,
        dueConceptCount: 0,
        weakConceptCount: 0,
      },
      certifications: catalog.map((certification) => ({
        slug: certification.slug,
        name: certification.name,
        readinessPercent: 0,
        masteredConcepts: 0,
        totalConcepts: certification.slug === "security-plus" ? total : 0,
        dueConceptCount: 0,
        weakConceptCount: 0,
      })),
      weakConcepts: [],
      dueConcepts: [],
      nextMission: missionFor(
        [],
        "security-plus-sy0-701",
        "security-plus",
        "SY0-701",
        new Date(),
      ),
    };
  }

  const [{ data: version }, map] = await Promise.all([
    db
      .from("exam_versions")
      .select("id, code, certification_id")
      .eq("id", plan.exam_version_id)
      .maybeSingle(),
    getKnowledgeMap(db, ownerUserId, plan.exam_version_id),
  ]);
  const cert = catalog.find((item) => item.id === version?.certification_id);
  const slug =
    cert && version
      ? certificationSlug(cert.slug, version.code)
      : "security-plus-sy0-701";
  const concepts = allConcepts(map);
  const now = new Date();
  const dueConcepts = concepts
    .filter(
      (concept) => concept.nextReview && new Date(concept.nextReview) <= now,
    )
    .sort((a, b) => a.mastery - b.mastery || a.name.localeCompare(b.name))
    .map((concept) => ({
      conceptId: concept.id,
      certificationSlug: slug,
      title: concept.name,
      dueAt: concept.nextReview!,
      masteryPercent: Math.round(concept.mastery),
    }));
  const weakConcepts = concepts
    .filter((concept) => WEAK_STATES.has(concept.state))
    .sort((a, b) => a.mastery - b.mastery || a.name.localeCompare(b.name))
    .map((concept) => ({
      conceptId: concept.id,
      certificationSlug: slug,
      title: concept.name,
      masteryPercent: Math.round(concept.mastery),
      reason: `${concept.state.replaceAll("_", " ").toLowerCase()} mastery state.`,
    }));
  const unseen = concepts.filter(
    (concept) => concept.state === "UNSEEN",
  ).length;
  const readiness = computeReadiness({
    coverage: map.conceptCount
      ? (map.conceptCount - unseen) / map.conceptCount
      : 0,
    mastery: map.overallMastery / 100,
    retention: map.dueConceptCount > 0 ? 0.25 : 0,
    mixedPerformance: 0,
    timedPerformance: 0,
    mockPerformance: 0,
    domainBalance: 0,
    confidenceCalibration: 0,
  }).score;
  const active = {
    slug,
    name: cert?.name ?? "Certification",
    readinessPercent: readiness,
    masteredConcepts: map.stateCounts.MASTERED,
    totalConcepts: map.conceptCount,
    dueConceptCount: dueConcepts.length,
    weakConceptCount: weakConcepts.length,
  };
  return {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    owner: { displayName },
    summary: {
      readinessPercent: readiness,
      currentStreakDays: 0,
      masteredConcepts: active.masteredConcepts,
      totalTrackedConcepts: active.totalConcepts,
      dueConceptCount: active.dueConceptCount,
      weakConceptCount: active.weakConceptCount,
    },
    certifications: catalog.map((item) =>
      item.id === cert?.id
        ? active
        : {
            slug: item.slug,
            name: item.name,
            readinessPercent: 0,
            masteredConcepts: 0,
            totalConcepts: 0,
            dueConceptCount: 0,
            weakConceptCount: 0,
          },
    ),
    weakConcepts,
    dueConcepts,
    nextMission: missionFor(
      concepts,
      slug,
      cert?.slug ?? "security-plus",
      version?.code ?? "SY0-701",
      now,
    ),
  };
}
