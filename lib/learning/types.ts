import type { LearnerState } from "@/lib/types/database";

export type { LearnerState };

/** Flashcard grade, Anki/FSRS convention: 1=Again 2=Hard 3=Good 4=Easy. */
export type Grade = 1 | 2 | 3 | 4;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
