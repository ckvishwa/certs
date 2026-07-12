"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { applyAttempt, type ConceptSnapshot } from "@/lib/learning/attempt";
import { classifyMistake } from "@/lib/learning/mistake-classify";
import type { LearnerState, MistakeTaxonomy } from "@/lib/types/database";

const submitSchema = z.object({
  questionId: z.string().uuid(),
  selectedChoiceIds: z.array(z.string().uuid()).max(10),
  responseMs: z.number().int().nonnegative().optional(),
  confidence: z
    .enum(["GUESSING", "UNSURE", "FAIRLY_SURE", "CERTAIN"])
    .optional(),
});

export interface AttemptFeedback {
  isCorrect: boolean;
  correctChoiceIds: string[];
  explanation: string | null;
  examTrap: string | null;
  objectiveTitle: string | null;
  objectiveCode: string | null;
  difficulty: number;
  choices: {
    id: string;
    label: string;
    isCorrect: boolean;
    rationale: string | null;
  }[];
  mistakeType: MistakeTaxonomy | null;
  conceptChanges: {
    id: string;
    name: string;
    before: number;
    after: number;
    direction: "demonstrated" | "weakened" | "unchanged";
  }[];
  prerequisiteGaps: string[];
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((x) => set.has(x));
}

/**
 * Grade a question attempt server-side, update the learner model for every
 * linked concept, log a classified mistake on failure, and return feedback.
 * Correct answers are never trusted from the client.
 */
export async function submitAttempt(input: unknown): Promise<AttemptFeedback> {
  const parsed = submitSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: question } = await supabase
    .from("questions")
    .select(
      "id, exam_version_id, objective_id, difficulty, kind, cognitive_skill, explanation, exam_trap",
    )
    .eq("id", parsed.questionId)
    .single();
  if (!question) throw new Error("Question not found");

  const { data: choices } = await supabase
    .from("question_choices")
    .select("id, label, body, is_correct, rationale")
    .eq("question_id", parsed.questionId)
    .order("position");
  const allChoices = choices ?? [];

  const validSelected = parsed.selectedChoiceIds.filter((id) =>
    allChoices.some((c) => c.id === id),
  );
  const correctChoiceIds = allChoices
    .filter((c) => c.is_correct)
    .map((c) => c.id);
  const isCorrect = sameSet(validSelected, correctChoiceIds);

  // Record the raw attempt.
  const { error: attemptError } = await supabase
    .from("question_attempts")
    .insert({
      user_id: user.id,
      question_id: parsed.questionId,
      selected: validSelected,
      is_correct: isCorrect,
      confidence: parsed.confidence ?? null,
      response_ms: parsed.responseMs ?? null,
      hint_used: false,
    });
  if (attemptError) throw new Error("Could not persist question attempt");

  // Concepts linked to this question.
  const { data: links } = await supabase
    .from("question_concepts")
    .select("concept_id")
    .eq("question_id", parsed.questionId);
  const conceptIds = (links ?? []).map((l) => l.concept_id);

  const [{ data: priorRows }, { data: dependencies }] = await Promise.all([
    conceptIds.length > 0
      ? supabase
          .from("learner_concept_state")
          .select("*")
          .eq("user_id", user.id)
          .in("concept_id", conceptIds)
      : Promise.resolve({ data: [] }),
    conceptIds.length > 0
      ? supabase
          .from("concept_dependencies")
          .select("concept_id, prerequisite_id")
          .in("concept_id", conceptIds)
      : Promise.resolve({ data: [] }),
  ]);

  const prerequisiteIds = [
    ...new Set((dependencies ?? []).map((row) => row.prerequisite_id)),
  ];
  const allConceptIds = [...new Set([...conceptIds, ...prerequisiteIds])];
  const [{ data: prerequisiteStates }, { data: conceptRows }] =
    await Promise.all([
      prerequisiteIds.length > 0
        ? supabase
            .from("learner_concept_state")
            .select("concept_id, mastery_score, state")
            .eq("user_id", user.id)
            .in("concept_id", prerequisiteIds)
        : Promise.resolve({ data: [] }),
      allConceptIds.length > 0
        ? supabase.from("concepts").select("id, name").in("id", allConceptIds)
        : Promise.resolve({ data: [] }),
    ]);

  const priorByConcept = new Map(
    (priorRows ?? []).map((row) => [row.concept_id, row]),
  );
  const prerequisiteStateByConcept = new Map(
    (prerequisiteStates ?? []).map((row) => [row.concept_id, row]),
  );
  const conceptNameById = new Map(
    (conceptRows ?? []).map((row) => [row.id, row.name]),
  );
  const prerequisiteGaps = prerequisiteIds.filter((id) => {
    const state = prerequisiteStateByConcept.get(id);
    return !state || Number(state.mastery_score) < 0.55;
  });

  const primaryConceptId: string | null = conceptIds[0] ?? null;
  const primaryPrior = primaryConceptId
    ? priorByConcept.get(primaryConceptId)
    : undefined;
  const primaryPriorState: ConceptSnapshot = {
    exposureCount: primaryPrior?.exposure_count ?? 0,
    attemptCount: primaryPrior?.attempt_count ?? 0,
    correctCount: primaryPrior?.correct_count ?? 0,
    incorrectCount: primaryPrior?.incorrect_count ?? 0,
    recentAccuracy: primaryPrior ? Number(primaryPrior.recent_accuracy) : 0,
    masteryScore: primaryPrior ? Number(primaryPrior.mastery_score) : 0,
    consecutiveCorrect: primaryPrior?.consecutive_correct ?? 0,
    consecutiveIncorrect: primaryPrior?.consecutive_incorrect ?? 0,
    wasMastered: primaryPrior?.state === "MASTERED",
  };
  const primaryPriorLearnerState: LearnerState =
    primaryPrior?.state ?? "UNSEEN";
  const nowIso = new Date().toISOString();

  const conceptChanges: AttemptFeedback["conceptChanges"] = [];
  const stateUpdates = conceptIds.map((conceptId) => {
    const prior = priorByConcept.get(conceptId);

    const snapshot: ConceptSnapshot = {
      exposureCount: prior?.exposure_count ?? 0,
      attemptCount: prior?.attempt_count ?? 0,
      correctCount: prior?.correct_count ?? 0,
      incorrectCount: prior?.incorrect_count ?? 0,
      recentAccuracy: prior ? Number(prior.recent_accuracy) : 0,
      masteryScore: prior ? Number(prior.mastery_score) : 0,
      consecutiveCorrect: prior?.consecutive_correct ?? 0,
      consecutiveIncorrect: prior?.consecutive_incorrect ?? 0,
      wasMastered: prior?.state === "MASTERED",
    };

    const update = applyAttempt(snapshot, {
      isCorrect,
      difficulty: question.difficulty,
      skill: question.cognitive_skill,
    });

    conceptChanges.push({
      id: conceptId,
      name: conceptNameById.get(conceptId) ?? "Linked concept",
      before: snapshot.masteryScore,
      after: update.masteryScore,
      direction:
        update.masteryScore > snapshot.masteryScore
          ? "demonstrated"
          : update.masteryScore < snapshot.masteryScore
            ? "weakened"
            : "unchanged",
    });

    return {
      user_id: user.id,
      concept_id: conceptId,
      exam_version_id: question.exam_version_id,
      exposure_count: update.exposureCount,
      attempt_count: update.attemptCount,
      correct_count: update.correctCount,
      incorrect_count: update.incorrectCount,
      accuracy: update.accuracy,
      recent_accuracy: update.recentAccuracy,
      mastery_score: update.masteryScore,
      consecutive_correct: update.consecutiveCorrect,
      consecutive_incorrect: update.consecutiveIncorrect,
      state: update.state,
      last_studied: nowIso,
      last_recalled: isCorrect ? nowIso : (prior?.last_recalled ?? null),
    };
  });

  if (stateUpdates.length > 0) {
    const { error: stateError } = await supabase
      .from("learner_concept_state")
      .upsert(stateUpdates, { onConflict: "user_id,concept_id" });
    if (stateError) throw new Error("Could not persist learner state");
  }

  // Log a classified mistake on failure.
  let mistakeType: MistakeTaxonomy | null = null;
  if (!isCorrect) {
    mistakeType = classifyMistake({
      priorState: primaryPriorLearnerState,
      priorMastery: primaryPriorState.masteryScore,
      responseMs: parsed.responseMs ?? null,
      confidence: parsed.confidence ?? null,
      questionKind: question.kind,
      hasPrerequisiteGap: prerequisiteGaps.length > 0,
    });

    const { error: mistakeError } = await supabase.from("mistakes").insert({
      user_id: user.id,
      question_id: parsed.questionId,
      concept_id: primaryConceptId,
      objective_id: question.objective_id,
      type: mistakeType,
      confidence: parsed.confidence ?? null,
      chosen: validSelected,
      correct: correctChoiceIds,
      response_ms: parsed.responseMs ?? null,
    });
    if (mistakeError) throw new Error("Could not persist mistake evidence");
  }

  // Objective title for feedback.
  let objectiveTitle: string | null = null;
  let objectiveCode: string | null = null;
  if (question.objective_id) {
    const { data: obj } = await supabase
      .from("objectives")
      .select("code, title")
      .eq("id", question.objective_id)
      .maybeSingle();
    objectiveTitle = obj?.title ?? null;
    objectiveCode = obj?.code ?? null;
  }

  revalidatePath("/today");
  revalidatePath("/knowledge-map");

  return {
    isCorrect,
    correctChoiceIds,
    explanation: question.explanation,
    examTrap: question.exam_trap,
    objectiveTitle,
    objectiveCode,
    difficulty: question.difficulty,
    choices: allChoices.map((c) => ({
      id: c.id,
      label: c.label,
      isCorrect: c.is_correct,
      rationale: c.rationale,
    })),
    mistakeType,
    conceptChanges,
    prerequisiteGaps: prerequisiteGaps.map(
      (id) => conceptNameById.get(id) ?? "Unknown prerequisite",
    ),
  };
}
