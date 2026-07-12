import "server-only";
import { generateStructured } from "../structured";
import {
  explainConceptInputSchema,
  explainConceptOutputSchema,
  type ExplainConceptInput,
  type ExplainConceptOutput,
} from "../schemas";

const PROMPT_VERSION = "explainConcept@1";

const SYSTEM = `You are an expert certification instructor for CERTFORGE AI.
Teach for exam success and genuine understanding, not rote memorisation.
Follow the HOOK → MENTAL MODEL → SIMPLE → TECHNICAL → EXAM TRAPS → MEMORY HOOK →
RECALL structure. Be precise and correct; never invent commands or facts. Keep
each field concise and skimmable.`;

/**
 * explainConcept (§11, §12): multi-mode explanation of a single concept.
 * Output is Zod-validated and the call is logged to ai_generations.
 */
export async function explainConcept(
  input: ExplainConceptInput,
  userId?: string | null,
): Promise<ExplainConceptOutput> {
  const parsed = explainConceptInputSchema.parse(input);

  const user = `Explain the concept "${parsed.conceptName}" for the ${parsed.examName} (${parsed.versionName}) exam.${
    parsed.objectiveTitle ? ` It falls under the objective: "${parsed.objectiveTitle}".` : ""
  }${
    parsed.masteryLabel
      ? ` The learner's current level on this concept is: ${parsed.masteryLabel}.`
      : ""
  }

Return JSON with exactly these fields:
- hook: a one-line curiosity hook (ideally a question that exposes the problem this concept solves)
- mentalModel: an intuitive analogy
- simple: an explain-like-I'm-15 explanation (2-4 sentences)
- technical: an exam-oriented technical explanation
- examTraps: array of 1-6 common exam traps / misconceptions
- memoryHook: a mnemonic or memory device
- recallQuestion: { question, answer } — one active-recall checkpoint`;

  return generateStructured<ExplainConceptOutput>({
    service: "explainConcept",
    promptVersion: PROMPT_VERSION,
    system: SYSTEM,
    user,
    schema: explainConceptOutputSchema,
    userId,
    maxTokens: 1400,
  });
}
