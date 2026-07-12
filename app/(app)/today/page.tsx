import { redirect } from "next/navigation";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getActiveStudyPlan } from "@/lib/db/study-plan";
import { getKnowledgeMap } from "@/lib/db/knowledge-map";
import {
  generateDailyMission,
  type WeakConcept,
} from "@/lib/learning/scheduler";
import { computeReadiness } from "@/lib/learning/readiness";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TASK_META } from "@/components/app/task-meta";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const RESCUE_OR_ACTIVE = new Set([
  "NEEDS_RESCUE",
  "DECAYING",
  "FRAGILE",
  "LEARNING",
  "RECALLING",
  "APPLYING",
]);

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const plan = await getActiveStudyPlan(supabase, user.id);
  if (!plan) redirect("/onboarding");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  const name = profile?.display_name ?? user.email?.split("@")[0] ?? "there";

  const km = await getKnowledgeMap(supabase, user.id, plan.exam_version_id);

  // Available minutes today from the plan (weekend vs weekday).
  const day = new Date().getDay();
  const isWeekend = day === 0 || day === 6;
  const availableMinutes = isWeekend
    ? plan.weekend_minutes
    : plan.weekday_minutes;

  // Build weak-concept and unseen inputs from the knowledge map.
  const weakConcepts: WeakConcept[] = [];
  let unseen = 0;
  for (const domain of km.domains) {
    for (const obj of domain.objectives) {
      for (const c of obj.concepts) {
        if (c.state === "UNSEEN") unseen++;
        if (RESCUE_OR_ACTIVE.has(c.state)) {
          weakConcepts.push({
            conceptId: c.id,
            name: c.name,
            state: c.state,
            masteryScore: c.mastery / 100,
            domainWeight: (domain.weight ?? 0) / 100,
          });
        }
      }
    }
  }

  const mission = generateDailyMission({
    availableMinutes,
    dueReviewCount: 0, // wired live in a later slice
    weakConcepts,
    newConceptsAvailable: unseen,
  });

  const coverage =
    km.conceptCount > 0 ? (km.conceptCount - unseen) / km.conceptCount : 0;
  const readiness = computeReadiness({
    coverage,
    mastery: km.overallMastery / 100,
    retention: 0,
    mixedPerformance: 0,
    timedPerformance: 0,
    mockPerformance: 0,
    domainBalance: 0,
    confidenceCalibration: 0,
  });

  const daysRemaining = plan.target_exam_date
    ? differenceInCalendarDays(parseISO(plan.target_exam_date), new Date())
    : null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting()}, {name}.
        </h1>
        <p className="mt-1 text-muted-foreground">
          {mission.totalMinutes > 0 ? (
            <>
              You have{" "}
              <span className="font-medium text-foreground">
                {mission.totalMinutes} minutes
              </span>{" "}
              of high-value work today.
            </>
          ) : (
            <>No time budgeted today — adjust your plan to get a mission.</>
          )}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        {/* Mission */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Today&apos;s mission
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Preview generated from your live learner data. Guided study
              sessions arrive in the next slice.
            </p>
          </div>
          {mission.tasks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Nothing scheduled yet. Complete onboarding or add study time.
              </CardContent>
            </Card>
          ) : (
            mission.tasks.map((task, i) => {
              const meta = TASK_META[task.type];
              return (
                <Card key={i}>
                  <CardHeader className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{meta.label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        ~{task.estimatedMinutes} min
                      </span>
                    </div>
                    <CardTitle className="text-base">{task.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {task.reason}
                    </p>
                  </CardHeader>
                </Card>
              );
            })
          )}
          {mission.deferred.reviewsDeferred > 0 ? (
            <p className="text-xs text-muted-foreground">
              {mission.deferred.reviewsDeferred} reviews deferred to keep today
              balanced — they&apos;ll be rescheduled.
            </p>
          ) : null}
        </section>

        {/* Right rail */}
        <aside className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Exam readiness
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tabular-nums">
                  {readiness.score}
                </span>
                <span className="text-sm text-muted-foreground">/ 100</span>
                <Badge
                  variant={
                    readiness.band === "HIGH"
                      ? "success"
                      : readiness.band === "MODERATE"
                        ? "warning"
                        : "destructive"
                  }
                  className="ml-auto"
                >
                  {readiness.band}
                </Badge>
              </div>
              <Progress value={readiness.score} />
              <p className="text-xs text-muted-foreground">
                Internal estimate. Limiting factor:{" "}
                <span className="text-foreground">
                  {readiness.limitingFactor}
                </span>
                .
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 py-4 text-sm">
              <Row label="Syllabus coverage" value={`${Math.round(coverage * 100)}%`} />
              <Row
                label="Concepts started"
                value={`${km.conceptCount - unseen} / ${km.conceptCount}`}
              />
              <Row
                label="Exam date"
                value={plan.target_exam_date ?? "Not set"}
              />
              {daysRemaining !== null ? (
                <Row
                  label="Days remaining"
                  value={daysRemaining >= 0 ? `${daysRemaining}` : "Past due"}
                />
              ) : null}
              <Row
                label="Daily budget"
                value={`${availableMinutes} min`}
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
