import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, QuestionKind } from "@/lib/types/database";

type DB = SupabaseClient<Database>;

/** Client-safe choice — never includes is_correct or rationale. */
export interface QuizChoice {
  id: string;
  label: string;
  body: string;
}

export interface QuizQuestion {
  id: string;
  stem: string;
  kind: QuestionKind;
  difficulty: number;
  objectiveTitle: string | null;
  choices: QuizChoice[];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build a client-safe quiz for an exam version. Correct answers and rationales
 * are deliberately withheld — grading happens server-side in submitAttempt.
 * `conceptIds`, when provided, filters to questions touching those concepts
 * (weakness mode).
 */
export async function buildQuiz(
  db: DB,
  examVersionId: string,
  count: number,
  conceptIds?: string[],
): Promise<QuizQuestion[]> {
  let questionIds: string[] | null = null;

  if (conceptIds && conceptIds.length > 0) {
    const { data: links } = await db
      .from("question_concepts")
      .select("question_id")
      .in("concept_id", conceptIds);
    questionIds = [...new Set((links ?? []).map((l) => l.question_id))];
    if (questionIds.length === 0) return [];
  }

  let query = db
    .from("questions")
    .select("id, stem, kind, difficulty, objective_id")
    .eq("exam_version_id", examVersionId);
  if (questionIds) query = query.in("id", questionIds);

  const { data: questions } = await query;
  if (!questions || questions.length === 0) return [];

  const chosen = shuffle(questions).slice(0, count);
  const ids = chosen.map((q) => q.id);
  const objectiveIds = [
    ...new Set(chosen.map((q) => q.objective_id).filter((v): v is string => !!v)),
  ];

  const [{ data: choices }, { data: objectives }] = await Promise.all([
    db
      .from("question_choices")
      .select("id, question_id, label, body, position")
      .in("question_id", ids)
      .order("position"),
    objectiveIds.length > 0
      ? db.from("objectives").select("id, title").in("id", objectiveIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ]);

  const titleById = new Map((objectives ?? []).map((o) => [o.id, o.title]));

  return chosen.map((q) => ({
    id: q.id,
    stem: q.stem,
    kind: q.kind,
    difficulty: q.difficulty,
    objectiveTitle: q.objective_id ? (titleById.get(q.objective_id) ?? null) : null,
    choices: (choices ?? [])
      .filter((c) => c.question_id === q.id)
      .map((c) => ({ id: c.id, label: c.label, body: c.body })),
  }));
}
