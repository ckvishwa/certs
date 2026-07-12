import type { SupabaseClient } from "@supabase/supabase-js";
import {
  aggregateObjectiveMastery,
  type ObjectiveMasteryState,
} from "@/lib/learning/objective-mastery";
import { isMistakeTaxonomy } from "@/lib/learning/mistake-heatmap";
import type {
  Database,
  LearnerState,
  MistakeTaxonomy,
} from "@/lib/types/database";

type DB = SupabaseClient<Database>;

export interface KMConcept {
  id: string;
  objectiveId: string;
  name: string;
  slug: string;
  mastery: number;
  state: LearnerState;
  attemptCount: number;
  correctCount: number;
  incorrectCount: number;
  nextReview: string | null;
  isPlaceholder: boolean;
}

export interface KMRecentMistake {
  id: string;
  objectiveId: string | null;
  conceptName: string | null;
  questionStem: string | null;
  type: MistakeTaxonomy | null;
  createdAt: string;
}

export interface KMPrerequisiteGap {
  conceptId: string;
  conceptName: string;
  prerequisiteId: string;
  prerequisiteName: string;
  prerequisiteMastery: number;
}

export interface KMObjective {
  id: string;
  code: string;
  title: string;
  isPlaceholder: boolean;
  mastery: number;
  masteryState: ObjectiveMasteryState;
  masteredConcepts: number;
  totalConcepts: number;
  reviewDue: boolean;
  dueConcepts: number;
  recommendedAction: string;
  recentMistakes: KMRecentMistake[];
  prerequisiteGaps: KMPrerequisiteGap[];
  concepts: KMConcept[];
}

export interface KMDomain {
  id: string;
  code: string;
  title: string;
  weight: number | null;
  mastery: number;
  objectives: KMObjective[];
}

export interface KMDependency {
  conceptId: string;
  conceptName: string;
  prerequisiteId: string;
  prerequisiteName: string;
}

export interface KnowledgeMap {
  domains: KMDomain[];
  overallMastery: number;
  stateCounts: Record<LearnerState, number>;
  conceptCount: number;
  objectiveCount: number;
  dueConceptCount: number;
  mistakes: KMRecentMistake[];
  dependencies: KMDependency[];
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
 * Load the complete learner map with a bounded set of batched queries. No query
 * is issued per domain, objective, or concept.
 */
export async function getKnowledgeMap(
  db: DB,
  userId: string,
  examVersionId: string,
): Promise<KnowledgeMap> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const [
    { data: domains },
    { data: objectives },
    { data: concepts },
    { data: states },
    { data: mistakeRows },
  ] = await Promise.all([
    db
      .from("domains")
      .select("id, code, title, weight, position")
      .eq("exam_version_id", examVersionId)
      .order("position"),
    db
      .from("objectives")
      .select("id, domain_id, code, title, is_placeholder, position")
      .eq("exam_version_id", examVersionId)
      .order("position"),
    db
      .from("concepts")
      .select("id, objective_id, slug, name, is_placeholder, position")
      .eq("exam_version_id", examVersionId)
      .order("position"),
    db
      .from("learner_concept_state")
      .select(
        "concept_id, mastery_score, state, attempt_count, correct_count, incorrect_count, next_review",
      )
      .eq("user_id", userId)
      .eq("exam_version_id", examVersionId),
    db
      .from("mistakes")
      .select("id, objective_id, concept_id, question_id, type, created_at")
      .eq("user_id", userId)
      .gte("created_at", ninetyDaysAgo.toISOString())
      .order("created_at", { ascending: false }),
  ]);

  const conceptIds = (concepts ?? []).map((concept) => concept.id);
  const objectiveIdByConcept = new Map(
    (concepts ?? []).map((concept) => [concept.id, concept.objective_id]),
  );
  const objectiveIds = new Set(
    (objectives ?? []).map((objective) => objective.id),
  );
  const scopedMistakes = (mistakeRows ?? [])
    .map((mistake) => ({
      ...mistake,
      resolved_objective_id:
        mistake.objective_id ??
        (mistake.concept_id
          ? (objectiveIdByConcept.get(mistake.concept_id) ?? null)
          : null),
    }))
    .filter(
      (mistake) =>
        mistake.resolved_objective_id !== null &&
        objectiveIds.has(mistake.resolved_objective_id),
    );
  const questionIds = [
    ...new Set(
      scopedMistakes
        .map((mistake) => mistake.question_id)
        .filter((id): id is string => id !== null),
    ),
  ];

  const [{ data: dependencyRows }, { data: questionRows }] = await Promise.all([
    conceptIds.length > 0
      ? db
          .from("concept_dependencies")
          .select("concept_id, prerequisite_id")
          .in("concept_id", conceptIds)
      : Promise.resolve({ data: [] }),
    questionIds.length > 0
      ? db.from("questions").select("id, stem").in("id", questionIds)
      : Promise.resolve({ data: [] }),
  ]);

  const stateByConcept = new Map(
    (states ?? []).map((state) => [state.concept_id, state]),
  );
  const conceptById = new Map(
    (concepts ?? []).map((concept) => [concept.id, concept]),
  );
  const questionById = new Map(
    (questionRows ?? []).map((question) => [question.id, question.stem]),
  );

  const mistakes: KMRecentMistake[] = scopedMistakes.map((mistake) => ({
    id: mistake.id,
    objectiveId: mistake.resolved_objective_id,
    conceptName: mistake.concept_id
      ? (conceptById.get(mistake.concept_id)?.name ?? null)
      : null,
    questionStem: mistake.question_id
      ? (questionById.get(mistake.question_id) ?? null)
      : null,
    type: isMistakeTaxonomy(mistake.type) ? mistake.type : null,
    createdAt: mistake.created_at,
  }));

  const dependencies: KMDependency[] = (dependencyRows ?? [])
    .map((dependency) => {
      const concept = conceptById.get(dependency.concept_id);
      const prerequisite = conceptById.get(dependency.prerequisite_id);
      if (!concept || !prerequisite) return null;
      return {
        conceptId: concept.id,
        conceptName: concept.name,
        prerequisiteId: prerequisite.id,
        prerequisiteName: prerequisite.name,
      };
    })
    .filter((dependency): dependency is KMDependency => dependency !== null);

  const stateCounts = emptyStateCounts();
  const allConceptMasteries: number[] = [];
  const now = new Date();

  const kmDomains: KMDomain[] = (domains ?? []).map((domain) => {
    const domainObjectives = (objectives ?? []).filter(
      (objective) => objective.domain_id === domain.id,
    );

    const kmObjectives: KMObjective[] = domainObjectives.map((objective) => {
      const objectiveConcepts = (concepts ?? []).filter(
        (concept) => concept.objective_id === objective.id,
      );

      const kmConcepts: KMConcept[] = objectiveConcepts.map((concept) => {
        const learner = stateByConcept.get(concept.id);
        const state = learner?.state ?? "UNSEEN";
        const mastery = learner ? Number(learner.mastery_score) * 100 : 0;
        stateCounts[state]++;
        allConceptMasteries.push(mastery);
        return {
          id: concept.id,
          objectiveId: objective.id,
          name: concept.name,
          slug: concept.slug,
          mastery,
          state,
          attemptCount: learner?.attempt_count ?? 0,
          correctCount: learner?.correct_count ?? 0,
          incorrectCount: learner?.incorrect_count ?? 0,
          nextReview: learner?.next_review ?? null,
          isPlaceholder: concept.is_placeholder,
        };
      });

      const summary = aggregateObjectiveMastery(kmConcepts, now);
      const objectiveMistakes = mistakes.filter(
        (mistake) => mistake.objectiveId === objective.id,
      );
      const conceptIdSet = new Set(kmConcepts.map((concept) => concept.id));
      const prerequisiteGaps: KMPrerequisiteGap[] = dependencies
        .filter((dependency) => conceptIdSet.has(dependency.conceptId))
        .map((dependency) => {
          const prerequisite = stateByConcept.get(dependency.prerequisiteId);
          return {
            ...dependency,
            prerequisiteMastery: prerequisite
              ? Number(prerequisite.mastery_score) * 100
              : 0,
          };
        })
        .filter((gap) => gap.prerequisiteMastery < 55);

      return {
        id: objective.id,
        code: objective.code,
        title: objective.title,
        isPlaceholder: objective.is_placeholder,
        mastery: summary.mastery,
        masteryState: summary.state,
        masteredConcepts: summary.masteredConcepts,
        totalConcepts: summary.totalConcepts,
        reviewDue: summary.reviewDue,
        dueConcepts: summary.dueConcepts,
        recommendedAction: summary.recommendedAction,
        recentMistakes: objectiveMistakes,
        prerequisiteGaps,
        concepts: kmConcepts,
      };
    });

    return {
      id: domain.id,
      code: domain.code,
      title: domain.title,
      weight: domain.weight,
      mastery: avg(
        kmObjectives.flatMap((objective) =>
          objective.concepts.map((concept) => concept.mastery),
        ),
      ),
      objectives: kmObjectives,
    };
  });

  return {
    domains: kmDomains,
    overallMastery: avg(allConceptMasteries),
    stateCounts,
    conceptCount: allConceptMasteries.length,
    objectiveCount: kmDomains.reduce(
      (count, domain) => count + domain.objectives.length,
      0,
    ),
    dueConceptCount: kmDomains.reduce(
      (count, domain) =>
        count +
        domain.objectives.reduce(
          (objectiveCount, objective) => objectiveCount + objective.dueConcepts,
          0,
        ),
      0,
    ),
    mistakes,
    dependencies,
  };
}
