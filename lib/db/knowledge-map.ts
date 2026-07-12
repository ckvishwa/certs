import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, LearnerState } from "@/lib/types/database";

type DB = SupabaseClient<Database>;

export interface KMConcept {
  id: string;
  name: string;
  slug: string;
  mastery: number; // 0..100
  state: LearnerState;
  isPlaceholder: boolean;
}

export interface KMObjective {
  id: string;
  code: string;
  title: string;
  isPlaceholder: boolean;
  mastery: number; // 0..100
  concepts: KMConcept[];
}

export interface KMDomain {
  id: string;
  code: string;
  title: string;
  weight: number | null;
  mastery: number; // 0..100
  objectives: KMObjective[];
}

export interface KnowledgeMap {
  domains: KMDomain[];
  overallMastery: number; // 0..100
  stateCounts: Record<LearnerState, number>;
  conceptCount: number;
}

function emptyStateCounts(): Record<LearnerState, number> {
  return {
    UNSEEN: 0,
    EXPOSED: 0,
    LEARNING: 0,
    FRAGILE: 0,
    RECALLING: 0,
    APPLYING: 0,
    MASTERED: 0,
    DECAYING: 0,
    NEEDS_RESCUE: 0,
  };
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Build the knowledge-map tree for a user + exam version: domains → objectives →
 * concepts, each annotated with aggregated mastery and, per concept, the learner
 * state. Aggregation rolls concept mastery up through objectives to domains.
 */
export async function getKnowledgeMap(
  db: DB,
  userId: string,
  examVersionId: string,
): Promise<KnowledgeMap> {
  const [{ data: domains }, { data: objectives }, { data: concepts }, { data: states }] =
    await Promise.all([
      db
        .from("domains")
        .select("*")
        .eq("exam_version_id", examVersionId)
        .order("position"),
      db
        .from("objectives")
        .select("*")
        .eq("exam_version_id", examVersionId)
        .order("position"),
      db
        .from("concepts")
        .select("*")
        .eq("exam_version_id", examVersionId)
        .order("position"),
      db
        .from("learner_concept_state")
        .select("concept_id, mastery_score, state")
        .eq("user_id", userId)
        .eq("exam_version_id", examVersionId),
    ]);

  const stateByConcept = new Map<string, { mastery: number; state: LearnerState }>();
  for (const s of states ?? []) {
    stateByConcept.set(s.concept_id, {
      mastery: Number(s.mastery_score) * 100,
      state: s.state,
    });
  }

  const stateCounts = emptyStateCounts();
  const allConceptMasteries: number[] = [];

  const kmDomains: KMDomain[] = (domains ?? []).map((domain) => {
    const domainObjectives = (objectives ?? []).filter(
      (o) => o.domain_id === domain.id,
    );

    const kmObjectives: KMObjective[] = domainObjectives.map((obj) => {
      const objConcepts = (concepts ?? []).filter(
        (c) => c.objective_id === obj.id,
      );

      const kmConcepts: KMConcept[] = objConcepts.map((c) => {
        const st = stateByConcept.get(c.id);
        const state = st?.state ?? "UNSEEN";
        const mastery = st?.mastery ?? 0;
        stateCounts[state]++;
        allConceptMasteries.push(mastery);
        return {
          id: c.id,
          name: c.name,
          slug: c.slug,
          mastery,
          state,
          isPlaceholder: c.is_placeholder,
        };
      });

      return {
        id: obj.id,
        code: obj.code,
        title: obj.title,
        isPlaceholder: obj.is_placeholder,
        mastery: avg(kmConcepts.map((c) => c.mastery)),
        concepts: kmConcepts,
      };
    });

    return {
      id: domain.id,
      code: domain.code,
      title: domain.title,
      weight: domain.weight,
      mastery: avg(
        kmObjectives.flatMap((o) => o.concepts.map((c) => c.mastery)),
      ),
      objectives: kmObjectives,
    };
  });

  return {
    domains: kmDomains,
    overallMastery: avg(allConceptMasteries),
    stateCounts,
    conceptCount: allConceptMasteries.length,
  };
}
