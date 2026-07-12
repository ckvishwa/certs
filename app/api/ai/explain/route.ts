import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { explainConcept } from "@/lib/ai/services/explain-concept";

const bodySchema = z.object({ conceptId: z.string().uuid() });

/**
 * AI is frozen for the current release (not linked from navigation). This
 * route stays in the codebase for the future AI slice but must not be
 * directly callable in the meantime — no auth check, Supabase call, or AI
 * provider should even be reached. Flip to `true` when the AI slice unfreezes.
 */
const AI_FEATURES_ENABLED = false;

/**
 * Vertical proof of the AI pipeline: authenticated user requests a structured,
 * multi-mode explanation of a concept. Auth + data access respect RLS.
 */
export async function POST(request: Request) {
  if (!AI_FEATURES_ENABLED) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Load concept, then its objective + exam version context (RLS-scoped reads).
  const { data: concept, error } = await supabase
    .from("concepts")
    .select("id, name, objective_id, exam_version_id")
    .eq("id", parsed.data.conceptId)
    .single();

  if (error || !concept) {
    return NextResponse.json({ error: "Concept not found" }, { status: 404 });
  }

  const [{ data: objective }, { data: examVersion }] = await Promise.all([
    supabase
      .from("objectives")
      .select("title")
      .eq("id", concept.objective_id)
      .single(),
    supabase
      .from("exam_versions")
      .select("name")
      .eq("id", concept.exam_version_id)
      .single(),
  ]);

  try {
    const explanation = await explainConcept(
      {
        conceptName: concept.name,
        examName: examVersion?.name ?? "certification exam",
        versionName: examVersion?.name ?? "current",
        objectiveTitle: objective?.title,
      },
      user.id,
    );
    return NextResponse.json({ explanation });
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
