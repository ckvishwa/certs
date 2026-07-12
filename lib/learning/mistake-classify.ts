import type {
  ConfidenceLevel,
  LearnerState,
  MistakeTaxonomy,
  MistakeType,
  QuestionKind,
} from "@/lib/types/database";

/**
 * Conservative classifier for signals the application can support directly.
 * Returning null is intentional: a missing classification is safer than an
 * invented cause, and the heatmap excludes unclassified attempts.
 */
export const CLASSIFY_CONFIG = {
  fastMs: 4000, // faster than this on a wrong answer ⇒ likely misread
  slowMs: 90000, // slower than this ⇒ likely time pressure
  knowledgeGapMastery: 0.2,
} as const;

export interface MistakeSignals {
  priorState: LearnerState;
  priorMastery: number; // 0..1
  responseMs?: number | null;
  confidence?: ConfidenceLevel | null;
  questionKind?: QuestionKind;
  hasPrerequisiteGap?: boolean;
}

export function classifyMistake(s: MistakeSignals): MistakeTaxonomy | null {
  const c = CLASSIFY_CONFIG;

  if (s.hasPrerequisiteGap) return "PREREQUISITE_GAP";
  if (s.confidence === "CERTAIN") return "CONCEPT_CONFUSION";
  if (s.responseMs != null && s.responseMs < c.fastMs) return "KEYWORD_TRAP";

  // Never really learned it.
  if (
    s.priorState === "UNSEEN" ||
    s.priorState === "EXPOSED" ||
    s.priorMastery < c.knowledgeGapMastery
  )
    return "KNOWLEDGE_GAP";

  return null;
}

/** Human-readable labels for the dashboard. */
export const MISTAKE_LABELS: Record<MistakeType, string> = {
  KNOWLEDGE_GAP: "Knowledge gap",
  CONCEPT_CONFUSION: "Concept confusion",
  SCOPE_ERROR: "Scope error",
  KEYWORD_TRAP: "Keyword trap",
  PREREQUISITE_GAP: "Prerequisite gap",
  MEMORY_FAILURE: "Memory failure",
  CONFUSION: "Confusion",
  READING_ERROR: "Reading error",
  COMMAND_SYNTAX: "Command syntax",
  CALCULATION: "Calculation error",
  OVERTHINKING: "Overthinking",
  TIME_PRESSURE: "Time pressure",
};
