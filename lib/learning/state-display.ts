import type { LearnerState } from "@/lib/types/database";

/**
 * Presentation metadata for learner states. Every state carries a glyph AND a
 * label AND a color so status is never conveyed by color alone (accessibility).
 */
export interface StateDisplay {
  label: string;
  glyph: string;
  colorVar: string;
  description: string;
}

export const STATE_DISPLAY: Record<LearnerState, StateDisplay> = {
  UNSEEN: {
    label: "Unseen",
    glyph: "○",
    colorVar: "var(--state-unseen)",
    description: "Not yet encountered.",
  },
  EXPOSED: {
    label: "Exposed",
    glyph: "◌",
    colorVar: "var(--state-unseen)",
    description: "Read or watched, not yet tested.",
  },
  LEARNING: {
    label: "Learning",
    glyph: "◔",
    colorVar: "var(--state-learning)",
    description: "Improving but inconsistent.",
  },
  FRAGILE: {
    label: "Fragile",
    glyph: "◑",
    colorVar: "var(--state-fragile)",
    description: "Correct recently, retention uncertain.",
  },
  RECALLING: {
    label: "Recalling",
    glyph: "◕",
    colorVar: "var(--state-recalling)",
    description: "Can retrieve reliably.",
  },
  APPLYING: {
    label: "Applying",
    glyph: "◉",
    colorVar: "var(--state-recalling)",
    description: "Can solve scenarios.",
  },
  MASTERED: {
    label: "Mastered",
    glyph: "●",
    colorVar: "var(--state-mastered)",
    description: "Repeated successful recall over time.",
  },
  DECAYING: {
    label: "Decaying",
    glyph: "◒",
    colorVar: "var(--state-decaying)",
    description: "Previously known; retention dropping.",
  },
  NEEDS_RESCUE: {
    label: "Needs rescue",
    glyph: "✕",
    colorVar: "var(--state-critical)",
    description: "Repeatedly failed — fix the root cause.",
  },
};

/** Map a 0..100 mastery value to a color for progress bars. */
export function masteryColor(mastery: number): string {
  if (mastery >= 85) return "var(--state-mastered)";
  if (mastery >= 55) return "var(--state-recalling)";
  if (mastery >= 30) return "var(--state-learning)";
  if (mastery > 0) return "var(--state-fragile)";
  return "var(--state-unseen)";
}
