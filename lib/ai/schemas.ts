import { z } from "zod";

/**
 * Zod schemas for AI service I/O. Output schemas are the validation contract for
 * every model response (see structured.ts).
 */

export const explainConceptInputSchema = z.object({
  conceptName: z.string().min(1),
  examName: z.string().min(1),
  versionName: z.string().min(1),
  objectiveTitle: z.string().optional(),
  masteryLabel: z.string().optional(),
});
export type ExplainConceptInput = z.infer<typeof explainConceptInputSchema>;

export const explainConceptOutputSchema = z.object({
  hook: z.string().describe("A one-line curiosity hook or question."),
  mentalModel: z.string().describe("An intuitive analogy or mental model."),
  simple: z.string().describe("Explain-like-I'm-15 explanation."),
  technical: z.string().describe("Exam-oriented technical explanation."),
  examTraps: z.array(z.string()).min(1).max(6),
  memoryHook: z.string(),
  recallQuestion: z.object({
    question: z.string(),
    answer: z.string(),
  }),
});
export type ExplainConceptOutput = z.infer<typeof explainConceptOutputSchema>;
