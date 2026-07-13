import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, LearnerState } from "@/lib/types/database";
import { getActiveStudyPlan } from "@/lib/db/study-plan";
import {
  getCertificationsWithVersions,
  type CertOption,
} from "@/lib/db/certifications";
import { getKnowledgeMap } from "@/lib/db/knowledge-map";
import { computeReadiness } from "@/lib/learning/readiness";
import { generateDailyMission, type WeakConcept } from "@/lib/learning/scheduler";

type DB = SupabaseClient<Database>;

const WEAK_STATES = new Set<LearnerState>(["NEEDS_RESCUE", "DECAYING", "FRAGILE"]);
// Same set Today's page uses to build the scheduler's weak-concept pool.
const ACTIVE_STATES = new Set<LearnerState>([
  "NEEDS_RESCUE",
  "DECAYING",
  "FRAGILE",
  "LEARNING",
  "RECALLING",
  "APPLYING",
]);

export interface LearnCertificationRef {
  id: string;
  slug: string;
  name: string;
  version: string;
}

export interface LearnCertificationCatalogEntry {
  id: string;
  slug: string;
  name: string;
  vendor: string;
  activeVersion: { id: string; code: string; name: string } | null;
}

export interface LearnMission {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  route: string;
}

export interface LearnProgress {
  masteredConcepts: number;
  totalConcepts: number;
  dueConcepts: number;
  weakConcepts: number;
  readinessScore: number;
  studyStreakDays: number;
}

export interface LearnSummaryResponse {
  activeCertification: LearnCertificationRef | null;
  progress: LearnProgress;
  nextMission: LearnMission | null;
  certifications: LearnCertificationCatalogEntry[];
}

function toCatalog(certs: CertOption[]): LearnCertificationCatalogEntry[] {
  return certs.map((cert) => {
    const active = cert.versions.find((v) => v.isActive) ?? cert.versions[0] ?? null;
    return {
      id: cert.id,
      slug: cert.slug,
      name: cert.name,
      vendor: cert.vendor,
      activeVersion: active
        ? { id: active.id, code: active.code, name: active.name }
        : null,
    };
  });
}

function emptyProgress(): LearnProgress {
  return {
    masteredConcepts: 0,
    totalConcepts: 0,
    dueConcepts: 0,
    weakConcepts: 0,
    readinessScore: 0,
    studyStreakDays: 0,
  };
}

/**
 * Composes the mobile Learn summary entirely from existing, already-tested
 * Certs logic (active study plan, knowledge map, readiness formula, daily
 * mission scheduler) — no mastery/readiness/scheduling math lives here. Takes
 * userId from the caller, never trusts anything client-supplied; every
 * downstream call filters by this same userId (RLS is the enforcement, this
 * is the ownership plumbing).
 */
export async function buildLearnSummary(
  db: DB,
  userId: string,
): Promise<LearnSummaryResponse> {
  const [plan, certs] = await Promise.all([
    getActiveStudyPlan(db, userId),
    getCertificationsWithVersions(db),
  ]);

  const certifications = toCatalog(certs);

  if (!plan) {
    return {
      activeCertification: null,
      progress: emptyProgress(),
      nextMission: null,
      certifications,
    };
  }

  const [{ data: examVersion }, map] = await Promise.all([
    db
      .from("exam_versions")
      .select("id, code, name, certification_id")
      .eq("id", plan.exam_version_id)
      .maybeSingle(),
    getKnowledgeMap(db, userId, plan.exam_version_id),
  ]);
  const certification = examVersion
    ? certs.find((c) => c.id === examVersion.certification_id)
    : undefined;

  const weakConcepts: WeakConcept[] = [];
  let unseen = 0;
  for (const domain of map.domains) {
    for (const objective of domain.objectives) {
      for (const concept of objective.concepts) {
        if (concept.state === "UNSEEN") unseen++;
        if (ACTIVE_STATES.has(concept.state)) {
          weakConcepts.push({
            conceptId: concept.id,
            name: concept.name,
            state: concept.state,
            masteryScore: concept.mastery / 100,
            domainWeight: (domain.weight ?? 0) / 100,
          });
        }
      }
    }
  }

  const isWeekend = [0, 6].includes(new Date().getDay());
  const availableMinutes = isWeekend ? plan.weekend_minutes : plan.weekday_minutes;
  const mission = generateDailyMission({
    availableMinutes,
    dueReviewCount: map.dueConceptCount,
    weakConcepts,
    newConceptsAvailable: unseen,
  });

  const coverage =
    map.conceptCount > 0 ? (map.conceptCount - unseen) / map.conceptCount : 0;
  // Identical formula and identical stubbed-input limitation as the web
  // Today page (docs/REVA_LEARN_AUDIT.md §9): coverage and mastery are real
  // signals, the other five readiness components aren't fed real data
  // anywhere in Certs yet. Mirrored here rather than "improved" so mobile and
  // web never silently disagree on the same user's readiness number.
  const readiness = computeReadiness({
    coverage,
    mastery: map.overallMastery / 100,
    retention: map.dueConceptCount > 0 ? 0.25 : 0,
    mixedPerformance: 0,
    timedPerformance: 0,
    mockPerformance: 0,
    domainBalance: 0,
    confidenceCalibration: 0,
  });

  const weakConceptCount = map.domains
    .flatMap((domain) => domain.objectives)
    .flatMap((objective) => objective.concepts)
    .filter((concept) => WEAK_STATES.has(concept.state)).length;

  const firstTask = mission.tasks[0] ?? null;

  return {
    activeCertification:
      examVersion && certification
        ? {
            id: examVersion.id,
            slug: `${certification.slug}-${examVersion.code.toLowerCase()}`,
            name: certification.name,
            version: examVersion.code,
          }
        : null,
    progress: {
      masteredConcepts: map.stateCounts.MASTERED,
      totalConcepts: map.conceptCount,
      dueConcepts: map.dueConceptCount,
      weakConcepts: weakConceptCount,
      readinessScore: readiness.score,
      // No study-streak model exists anywhere in Certs today (no streak
      // column/table in the schema, no streak logic in lib/learning) — 0 is
      // reported rather than fabricating a value the platform can't back.
      studyStreakDays: 0,
    },
    nextMission: firstTask
      ? {
          id: `${plan.exam_version_id}:${firstTask.type}:0`,
          title: firstTask.title,
          description: firstTask.reason,
          estimatedMinutes: firstTask.estimatedMinutes,
          route: "/today",
        }
      : null,
    certifications,
  };
}
