import type { MistakeTaxonomy } from "@/lib/types/database";

export const MISTAKE_TAXONOMY = [
  "KNOWLEDGE_GAP",
  "CONCEPT_CONFUSION",
  "SCOPE_ERROR",
  "KEYWORD_TRAP",
  "PREREQUISITE_GAP",
] as const satisfies readonly MistakeTaxonomy[];

export const MISTAKE_TAXONOMY_LABELS: Record<MistakeTaxonomy, string> = {
  KNOWLEDGE_GAP: "Knowledge gap",
  CONCEPT_CONFUSION: "Concept confusion",
  SCOPE_ERROR: "Scope error",
  KEYWORD_TRAP: "Keyword trap",
  PREREQUISITE_GAP: "Prerequisite gap",
};

export interface HeatmapMistake {
  id: string;
  objectiveId: string | null;
  conceptName: string | null;
  questionStem: string | null;
  type: MistakeTaxonomy | null;
  createdAt: string;
}

export interface MistakeHeatmapRow {
  objectiveId: string;
  objectiveCode: string;
  objectiveTitle: string;
  counts: Record<MistakeTaxonomy, number>;
  total: number;
}

export function isMistakeTaxonomy(
  value: string | null,
): value is MistakeTaxonomy {
  return MISTAKE_TAXONOMY.includes(value as MistakeTaxonomy);
}

export function aggregateMistakeHeatmap(
  objectives: { id: string; code: string; title: string }[],
  mistakes: HeatmapMistake[],
  since: Date | null = null,
): MistakeHeatmapRow[] {
  return objectives.map((objective) => {
    const counts = Object.fromEntries(
      MISTAKE_TAXONOMY.map((type) => [type, 0]),
    ) as Record<MistakeTaxonomy, number>;

    for (const mistake of mistakes) {
      if (mistake.objectiveId !== objective.id || mistake.type === null)
        continue;
      if (since && new Date(mistake.createdAt) < since) continue;
      counts[mistake.type]++;
    }

    return {
      objectiveId: objective.id,
      objectiveCode: objective.code,
      objectiveTitle: objective.title,
      counts,
      total: Object.values(counts).reduce((sum, count) => sum + count, 0),
    };
  });
}
