import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, StudyPlanRow } from "@/lib/types/database";

type DB = SupabaseClient<Database>;

/** The user's active study plan, or null if onboarding is incomplete. */
export async function getActiveStudyPlan(
  db: DB,
  userId: string,
): Promise<StudyPlanRow | null> {
  const { data } = await db
    .from("study_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  return data ?? null;
}
