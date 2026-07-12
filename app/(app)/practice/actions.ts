"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { applyAttempt, type ConceptSnapshot } from "@/lib/learning/attempt";
import { classifyMistake } from "@/lib/learning/mistake-classify";
import type { LearnerState, MistakeType } from "@/lib/types/database";

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
  difficulty: number;
  choices: {
    id: string;
    label: string;
    isCorrect: boolean;
    rationale: string | null;
  }[];
  mistakeType: MistakeType | null;
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
  await supabase.from("question_attempts").insert({
    user_id: user.id,
    question_id: parsed.questionId,
    selected: validSelected,
    is_correct: isCorrect,
    confidence: parsed.confidence ?? null,
    response_ms: parsed.responseMs ?? null,
    hint_used: false,
  });

  // Concepts linked to this question.
  const { data: links } = await supabase
    .from("question_concepts")
    .select("concept_id")
    .eq("question_id", parsed.questionId);
  const conceptIds = (links ?? []).map((l) => l.concept_id);

  const nowIso = new Date().toISOString();
  let primaryPriorState: ConceptSnapshot | null = null;
  let primaryPriorLearnerState: LearnerState = "UNSEEN";
  const primaryConceptId: string | null = conceptIds[0] ?? null;

  for (const conceptId of conceptIds) {
    const { data: prior } = await supabase
      .from("learner_concept_state")
      .select("*")
      .eq("user_id", user.id)
      .eq("concept_id", conceptId)
      .maybeSingle();

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

    if (conceptId === primaryConceptId) {
      primaryPriorState = snapshot;
      primaryPriorLearnerState = prior?.state ?? "UNSEEN";
    }

    const update = applyAttempt(snapshot, {
      isCorrect,
      difficulty: question.difficulty,
      skill: question.cognitive_skill,
    });

    await supabase.from("learner_concept_state").upsert(
      {
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
      },
      { onConflict: "user_id,concept_id" },
    );
  }

  // Log a classified mistake on failure.
  let mistakeType: MistakeType | null = null;
  if (!isCorrect) {
    mistakeType = classifyMistake({
      priorState: primaryPriorLearnerState,
      priorMastery: primaryPriorState?.masteryScore ?? 0,
      responseMs: parsed.responseMs ?? null,
      confidence: parsed.confidence ?? null,
      questionKind: question.kind,
    });

    await supabase.from("mistakes").insert({
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
  }

  // Objective title for feedback.
  let objectiveTitle: string | null = null;
  if (question.objective_id) {
    const { data: obj } = await supabase
      .from("objectives")
      .select("title")
      .eq("id", question.objective_id)
      .maybeSingle();
    objectiveTitle = obj?.title ?? null;
  }

  return {
    isCorrect,
    correctChoiceIds,
    explanation: question.explanation,
    examTrap: question.exam_trap,
    objectiveTitle,
    difficulty: question.difficulty,
    choices: allChoices.map((c) => ({
      id: c.id,
      label: c.label,
      isCorrect: c.is_correct,
      rationale: c.rationale,
    })),
    mistakeType,
  };
}
