import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, MistakeType } from "@/lib/types/database";

type DB = SupabaseClient<Database>;

export interface MistakeItem {
  id: string;
  createdAt: string;
  type: MistakeType | null;
  questionStem: string | null;
  conceptName: string | null;
  objectiveTitle: string | null;
}

export interface MistakesSummary {
  items: MistakeItem[];
  typeCounts: { type: MistakeType; count: number }[];
  total: number;
  topType: MistakeType | null;
  topShare: number; // 0..1
}

/** Recent mistakes for a user with question/concept/objective context. */
export async function getMistakes(
  db: DB,
  userId: string,
  limit = 50,
): Promise<MistakesSummary> {
  const { data: rows } = await db
    .from("mistakes")
    .select("id, created_at, type, question_id, concept_id, objective_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const mistakes = rows ?? [];
  const questionIds = [
    ...new Set(mistakes.map((m) => m.question_id).filter((v): v is string => !!v)),
  ];
  const conceptIds = [
    ...new Set(mistakes.map((m) => m.concept_id).filter((v): v is string => !!v)),
  ];
  const objectiveIds = [
    ...new Set(mistakes.map((m) => m.objective_id).filter((v): v is string => !!v)),
  ];

  const [{ data: questions }, { data: concepts }, { data: objectives }] =
    await Promise.all([
      questionIds.length
        ? db.from("questions").select("id, stem").in("id", questionIds)
        : Promise.resolve({ data: [] as { id: string; stem: string }[] }),
      conceptIds.length
        ? db.from("concepts").select("id, name").in("id", conceptIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      objectiveIds.length
        ? db.from("objectives").select("id, title").in("id", objectiveIds)
        : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    ]);

  const stemById = new Map((questions ?? []).map((q) => [q.id, q.stem]));
  const nameById = new Map((concepts ?? []).map((c) => [c.id, c.name]));
  const titleById = new Map((objectives ?? []).map((o) => [o.id, o.title]));

  const items: MistakeItem[] = mistakes.map((m) => ({
    id: m.id,
    createdAt: m.created_at,
    type: m.type,
    questionStem: m.question_id ? (stemById.get(m.question_id) ?? null) : null,
    conceptName: m.concept_id ? (nameById.get(m.concept_id) ?? null) : null,
    objectiveTitle: m.objective_id
      ? (titleById.get(m.objective_id) ?? null)
      : null,
  }));

  const countMap = new Map<MistakeType, number>();
  for (const m of mistakes) {
    if (m.type) countMap.set(m.type, (countMap.get(m.type) ?? 0) + 1);
  }
  const typeCounts = [...countMap.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  const total = mistakes.length;
  const topType = typeCounts[0]?.type ?? null;
  const topShare = total > 0 && typeCounts[0] ? typeCounts[0].count / total : 0;

  return { items, typeCounts, total, topType, topShare };
}
