import type {
  ConfidenceLevel,
  LearnerState,
  MistakeType,
  QuestionKind,
} from "@/lib/types/database";

/**
 * Heuristic mistake classifier (§17). Turns a wrong answer into a typed cause so
 * the dashboard can say WHY the learner is missing questions, not just that they
 * are. Some causes (CALCULATION, OVERTHINKING) need answer-content analysis and
 * are deferred to later slices; this covers the confidently-diagnosable cases.
 */
export const CLASSIFY_CONFIG = {
  fastMs: 4000, // faster than this on a wrong answer ⇒ likely misread
  slowMs: 90000, // slower than this ⇒ likely time pressure
  knowledgeGapMastery: 0.2,
  commandMinMastery: 0.4,
} as const;

export interface MistakeSignals {
  priorState: LearnerState;
  priorMastery: number; // 0..1
  responseMs?: number | null;
  confidence?: ConfidenceLevel | null;
  questionKind?: QuestionKind;
}

export function classifyMistake(s: MistakeSignals): MistakeType {
  const c = CLASSIFY_CONFIG;

  // Confidently wrong is the highest-signal case: a genuine misconception.
  if (s.confidence === "CERTAIN") return "CONFUSION";

  // Command syntax errors when the concept is otherwise understood.
  if (s.questionKind === "COMMAND" && s.priorMastery >= c.commandMinMastery)
    return "COMMAND_SYNTAX";

  // Previously known, now missed ⇒ forgetting.
  if (s.priorState === "MASTERED" || s.priorState === "DECAYING")
    return "MEMORY_FAILURE";

  // Never really learned it.
  if (
    s.priorState === "UNSEEN" ||
    s.priorState === "EXPOSED" ||
    s.priorMastery < c.knowledgeGapMastery
  )
    return "KNOWLEDGE_GAP";

  if (s.responseMs != null && s.responseMs < c.fastMs) return "READING_ERROR";
  if (s.responseMs != null && s.responseMs > c.slowMs) return "TIME_PRESSURE";

  return "KNOWLEDGE_GAP";
}

/** Human-readable labels for the dashboard. */
export const MISTAKE_LABELS: Record<MistakeType, string> = {
  KNOWLEDGE_GAP: "Knowledge gap",
  MEMORY_FAILURE: "Memory failure",
  CONFUSION: "Confusion",
  READING_ERROR: "Reading error",
  COMMAND_SYNTAX: "Command syntax",
  CALCULATION: "Calculation error",
  OVERTHINKING: "Overthinking",
  TIME_PRESSURE: "Time pressure",
};
