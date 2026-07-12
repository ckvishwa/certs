import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KnowledgeMapWorkspace } from "@/components/knowledge-map/knowledge-map-workspace";
import { Progress } from "@/components/ui/progress";
import { getKnowledgeMap } from "@/lib/db/knowledge-map";
import { getActiveStudyPlan } from "@/lib/db/study-plan";
import { masteryColor } from "@/lib/learning/state-display";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Knowledge Map" };

export default async function KnowledgeMapPage({
  searchParams,
}: {
  searchParams: Promise<{ objective?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const plan = await getActiveStudyPlan(supabase, user.id);
  if (!plan) redirect("/onboarding");

  const [{ data: version }, map, params] = await Promise.all([
    supabase
      .from("exam_versions")
      .select("name")
      .eq("id", plan.exam_version_id)
      .maybeSingle(),
    getKnowledgeMap(supabase, user.id, plan.exam_version_id),
    searchParams,
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="border-border mb-7 border-b pb-6">
        <p className="eyebrow">Live learner model</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Knowledge Map
            </h1>
            <p className="text-muted-foreground mt-1">
              {version?.name ?? "Your certification"} · {map.objectiveCount}{" "}
              objectives · {map.conceptCount} concepts
            </p>
          </div>
          <div className="w-full max-w-xs">
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-muted-foreground">Overall mastery</span>
              <span className="font-mono font-semibold tabular-nums">
                {Math.round(map.overallMastery)}%
              </span>
            </div>
            <Progress
              value={map.overallMastery}
              indicatorColor={masteryColor(map.overallMastery)}
            />
          </div>
        </div>
      </header>

      <KnowledgeMapWorkspace map={map} initialObjectiveId={params.objective} />
    </div>
  );
}
