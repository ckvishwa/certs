import type { TaskType } from "@/lib/types/database";

/** Display metadata for mission task types. */
export const TASK_META: Record<TaskType, { label: string; cta: string }> = {
  NEW_LEARNING: { label: "Learn", cta: "Start" },
  ACTIVE_RECALL: { label: "Recall", cta: "Start" },
  FLASHCARDS: { label: "Review", cta: "Review" },
  WEAK_REPAIR: { label: "Rescue", cta: "Start" },
  MIXED_QUIZ: { label: "Quiz", cta: "Begin" },
  TIMED_SPRINT: { label: "Sprint", cta: "Begin" },
  LAB: { label: "Lab", cta: "Open" },
  PBQ: { label: "PBQ", cta: "Open" },
  MOCK_EXAM: { label: "Mock", cta: "Take" },
  ERROR_REVIEW: { label: "Mistakes", cta: "Review" },
};
