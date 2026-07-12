import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveStudyPlan } from "@/lib/db/study-plan";
import { getKnowledgeMap } from "@/lib/db/knowledge-map";
import { STATE_DISPLAY, masteryColor } from "@/lib/learning/state-display";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { LearnerState } from "@/lib/types/database";

const LEGEND_ORDER: LearnerState[] = [
  "UNSEEN",
  "LEARNING",
  "FRAGILE",
  "RECALLING",
  "MASTERED",
  "DECAYING",
  "NEEDS_RESCUE",
];

export default async function KnowledgeMapPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const plan = await getActiveStudyPlan(supabase, user.id);
  if (!plan) redirect("/onboarding");

  const { data: version } = await supabase
    .from("exam_versions")
    .select("name")
    .eq("id", plan.exam_version_id)
    .maybeSingle();

  const km = await getKnowledgeMap(supabase, user.id, plan.exam_version_id);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Knowledge Map</h1>
        <p className="mt-1 text-muted-foreground">
          {version?.name ?? "Your certification"} · {km.conceptCount} concepts
        </p>
        <div className="mt-4 max-w-md">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall mastery</span>
            <span className="font-medium tabular-nums">
              {Math.round(km.overallMastery)}%
            </span>
          </div>
          <Progress
            value={km.overallMastery}
            indicatorColor={masteryColor(km.overallMastery)}
          />
        </div>

        {/* Legend — glyph + color + label (color is never the sole signal) */}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
          {LEGEND_ORDER.map((s) => {
            const d = STATE_DISPLAY[s];
            return (
              <span
                key={s}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <span aria-hidden style={{ color: d.colorVar }}>
                  {d.glyph}
                </span>
                {d.label}
                {km.stateCounts[s] > 0 ? (
                  <span className="text-foreground">({km.stateCounts[s]})</span>
                ) : null}
              </span>
            );
          })}
        </div>
      </header>

      <div className="space-y-3">
        {km.domains.map((domain) => (
          <details
            key={domain.id}
            className="group rounded-lg border border-border bg-card"
            open
          >
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
              <span className="font-mono text-xs text-muted-foreground">
                {domain.code}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">
                {domain.title}
              </span>
              {domain.weight !== null ? (
                <Badge variant="outline">{domain.weight}%</Badge>
              ) : null}
              <span className="hidden w-28 sm:block">
                <Progress
                  value={domain.mastery}
                  indicatorColor={masteryColor(domain.mastery)}
                />
              </span>
              <span className="w-10 text-right text-sm tabular-nums text-muted-foreground">
                {Math.round(domain.mastery)}%
              </span>
            </summary>

            <div className="space-y-4 border-t border-border px-4 py-4">
              {domain.objectives.map((obj) => (
                <div key={obj.id}>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {obj.code}
                    </span>
                    <span className="text-sm font-medium">{obj.title}</span>
                    {obj.isPlaceholder ? (
                      <span
                        className="rounded bg-warning/15 px-1.5 text-[10px] text-warning"
                        title="Official objective wording not yet sourced"
                      >
                        placeholder
                      </span>
                    ) : null}
                  </div>
                  {obj.concepts.length > 0 ? (
                    <div className="space-y-2">
                      {obj.concepts.map((c) => {
                        const display = STATE_DISPLAY[c.state];
                        return (
                          <div
                            key={c.id}
                            className="flex items-center gap-3 rounded-md border border-border/60 bg-background/40 px-3 py-2"
                          >
                            <span
                              aria-hidden
                              className="text-sm"
                              style={{ color: display.colorVar }}
                            >
                              {display.glyph}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-medium">
                                  {c.name}
                                </span>
                                {c.isPlaceholder ? (
                                  <span className="rounded bg-muted px-1 text-[10px] text-muted-foreground">
                                    placeholder
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-1 flex items-center gap-2">
                                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${Math.max(2, c.mastery)}%`,
                                      background: masteryColor(c.mastery),
                                    }}
                                  />
                                </div>
                                <span className="text-[11px] text-muted-foreground">
                                  {display.label} · {Math.round(c.mastery)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No concepts seeded for this objective yet.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
