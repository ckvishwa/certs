"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const onboardingSchema = z.object({
  certificationId: z.string().uuid(),
  examVersionId: z.string().uuid(),
  targetExamDate: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  weekdayMinutes: z.coerce.number().int().min(5).max(600),
  weekendMinutes: z.coerce.number().int().min(0).max(600),
  knowledgeLevel: z.enum(["NOVICE", "SOME", "STRONG", "EXPERT"]),
  intensity: z.enum(["LIGHT", "STEADY", "AGGRESSIVE"]),
});

export type OnboardingState = { error: string | null };

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const parsed = onboardingSchema.safeParse({
    certificationId: formData.get("certificationId"),
    examVersionId: formData.get("examVersionId"),
    targetExamDate: formData.get("targetExamDate") ?? undefined,
    weekdayMinutes: formData.get("weekdayMinutes"),
    weekendMinutes: formData.get("weekendMinutes"),
    knowledgeLevel: formData.get("knowledgeLevel"),
    intensity: formData.get("intensity"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  // Verify the selected version belongs to the selected certification.
  const { data: version } = await supabase
    .from("exam_versions")
    .select("id, certification_id")
    .eq("id", parsed.data.examVersionId)
    .maybeSingle();
  if (!version || version.certification_id !== parsed.data.certificationId) {
    return { error: "Invalid certification/version selection." };
  }

  // Deactivate any existing active plans, then create the new active plan.
  await supabase
    .from("study_plans")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .eq("is_active", true);

  const { error: insertError } = await supabase.from("study_plans").insert({
    user_id: user.id,
    certification_id: parsed.data.certificationId,
    exam_version_id: parsed.data.examVersionId,
    target_exam_date: parsed.data.targetExamDate,
    weekday_minutes: parsed.data.weekdayMinutes,
    weekend_minutes: parsed.data.weekendMinutes,
    knowledge_level: parsed.data.knowledgeLevel,
    intensity: parsed.data.intensity,
    is_active: true,
    onboarding_complete: true,
  });
  if (insertError) return { error: insertError.message };

  // Seed learner state (UNSEEN) for every concept in the chosen version.
  const { data: concepts } = await supabase
    .from("concepts")
    .select("id")
    .eq("exam_version_id", parsed.data.examVersionId);

  if (concepts && concepts.length > 0) {
    const rows = concepts.map((c) => ({
      user_id: user.id,
      concept_id: c.id,
      exam_version_id: parsed.data.examVersionId,
      state: "UNSEEN" as const,
    }));
    await supabase
      .from("learner_concept_state")
      .upsert(rows, { onConflict: "user_id,concept_id", ignoreDuplicates: true });
  }

  redirect("/today");
}
