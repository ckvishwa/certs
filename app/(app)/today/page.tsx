import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { differenceInCalendarDays, parseISO } from "date-fns";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Gauge,
  Target,
  TriangleAlert,
} from "lucide-react";
import { MistakePatternHeatmap } from "@/components/heatmaps/mistake-pattern-heatmap";
import { ObjectiveMasteryHeatmap } from "@/components/heatmaps/objective-mastery-heatmap";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getKnowledgeMap } from "@/lib/db/knowledge-map";
import { getActiveStudyPlan } from "@/lib/db/study-plan";
import { computeReadiness } from "@/lib/learning/readiness";
import {
  generateDailyMission,
  type WeakConcept,
} from "@/lib/learning/scheduler";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Today" };

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
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

const OBJECTIVE_PRIORITY = {
  due_for_review: 0,
  weak: 1,
  developing: 2,
  unseen: 3,
  mastered: 4,
} as const;

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const plan = await getActiveStudyPlan(supabase, user.id);
  if (!plan) redirect("/onboarding");

  const [{ data: profile }, map] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle(),
    getKnowledgeMap(supabase, user.id, plan.exam_version_id),
  ]);
  const name = profile?.display_name ?? user.email?.split("@")[0] ?? "there";

  const isWeekend = [0, 6].includes(new Date().getDay());
  const availableMinutes = isWeekend
    ? plan.weekend_minutes
    : plan.weekday_minutes;
  const weakConcepts: WeakConcept[] = [];
  let unseen = 0;
  for (const domain of map.domains) {
    for (const objective of domain.objectives) {
      for (const concept of objective.concepts) {
        if (concept.state === "UNSEEN") unseen++;
        if (RESCUE_OR_ACTIVE.has(concept.state)) {
          weakConcepts.push({
            conceptId: concept.id,
            name: concept.name,
            state: concept.state,
            masteryScore: concept.mastery / 100,
            domainWeight: (domain.weight ?? 0) / 100,
          });
        }
      }
    }
  }

  const mission = generateDailyMission({
    availableMinutes,
    dueReviewCount: map.dueConceptCount,
    weakConcepts,
    newConceptsAvailable: unseen,
  });
  const coverage =
    map.conceptCount > 0 ? (map.conceptCount - unseen) / map.conceptCount : 0;
  const readiness = computeReadiness({
    coverage,
    mastery: map.overallMastery / 100,
    retention: map.dueConceptCount > 0 ? 0.25 : 0,
    mixedPerformance: 0,
    timedPerformance: 0,
    mockPerformance: 0,
    domainBalance: 0,
    confidenceCalibration: 0,
  });

  const objectives = map.domains.flatMap((domain) => domain.objectives);
  const prioritizedObjectives = [...objectives].sort(
    (a, b) =>
      OBJECTIVE_PRIORITY[a.masteryState] - OBJECTIVE_PRIORITY[b.masteryState] ||
      a.mastery - b.mastery,
  );
  const primary = prioritizedObjectives[0] ?? null;
  const weakest = [...objectives]
    .filter((objective) => objective.masteryState !== "mastered")
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 4);
  const due = objectives.filter((objective) => objective.reviewDue).slice(0, 4);
  const daysRemaining = plan.target_exam_date
    ? differenceInCalendarDays(parseISO(plan.target_exam_date), new Date())
    : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6">
        <p className="eyebrow">Today</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {greeting()}, {name}.
        </h1>
      </header>

      <section className="border-border-strong bg-surface-raised overflow-hidden rounded-2xl border">
        <div className="grid lg:grid-cols-[290px_1fr]">
          <div className="border-border border-b p-6 lg:border-r lg:border-b-0">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Gauge className="size-4" />
              Current readiness
            </div>
            <div className="mt-3 flex items-end gap-3">
              <span className="font-mono text-5xl font-bold tabular-nums">
                {readiness.score}
              </span>
              <Badge
                variant={
                  readiness.band === "HIGH"
                    ? "success"
                    : readiness.band === "MODERATE"
                      ? "warning"
                      : "destructive"
                }
                className="mb-1"
              >
                {readiness.band}
              </Badge>
            </div>
            <Progress value={readiness.score} className="mt-4" />
            <p className="text-muted-foreground mt-3 text-xs">
              Limited by {readiness.limitingFactor}. Readiness uses demonstrated
              learning evidence, not activity volume.
            </p>
          </div>

          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-y-0 right-0 w-48 bg-[radial-gradient(circle_at_center,var(--primary),transparent_68%)] opacity-[0.08]" />
            <div className="relative max-w-2xl">
              <p className="eyebrow">Best next action</p>
              <h2 className="mt-2 text-2xl font-semibold">
                {primary
                  ? `${primary.masteryState === "unseen" ? "Start" : "Focus"} objective ${primary.code}`
                  : "Build your first learning signal"}
              </h2>
              <p className="text-muted-foreground mt-2 text-sm">
                {primary?.recommendedAction ??
                  "Choose an objective in the Knowledge Map."}
                {mission.totalMinutes > 0
                  ? ` Your plan allows ${mission.totalMinutes} focused minutes today.`
                  : ""}
              </p>
              <Link
                href={
                  primary
                    ? `/knowledge-map?objective=${primary.id}`
                    : "/knowledge-map"
                }
                className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring mt-5 inline-flex min-h-12 items-center gap-2 rounded-md px-5 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
              >
                {primary ? `Study ${primary.code} now` : "Open Knowledge Map"}
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-10">
        <ObjectiveMasteryHeatmap domains={map.domains} />
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <SignalList
          eyebrow="Repair queue"
          title="Weakest objectives"
          icon={TriangleAlert}
          empty="No weak objectives are currently detected."
          items={weakest.map((objective) => ({
            id: objective.id,
            code: objective.code,
            title: objective.title,
            detail: `${Math.round(objective.mastery)}% mastery · ${objective.recommendedAction}`,
          }))}
        />
        <SignalList
          eyebrow="Retention queue"
          title="Due for review"
          icon={Clock3}
          empty="No concepts are due for review."
          items={due.map((objective) => ({
            id: objective.id,
            code: objective.code,
            title: objective.title,
            detail: `${objective.dueConcepts} concept${objective.dueConcepts === 1 ? "" : "s"} due`,
          }))}
        />
      </div>

      <div className="border-border mt-12 border-t pt-10">
        <MistakePatternHeatmap
          objectives={objectives}
          mistakes={map.mistakes}
        />
      </div>

      <section
        className="border-border mt-12 border-t pt-8"
        aria-labelledby="study-activity-title"
      >
        <p className="eyebrow">Secondary context</p>
        <h2 id="study-activity-title" className="mt-1 text-lg font-semibold">
          Study activity
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            icon={Target}
            label="Concepts started"
            value={`${map.conceptCount - unseen} / ${map.conceptCount}`}
          />
          <Stat
            icon={Gauge}
            label="Syllabus coverage"
            value={`${Math.round(coverage * 100)}%`}
          />
          <Stat
            icon={CalendarDays}
            label="Exam date"
            value={plan.target_exam_date ?? "Not set"}
          />
          <Stat
            icon={Clock3}
            label="Days remaining"
            value={
              daysRemaining === null
                ? "Not set"
                : daysRemaining >= 0
                  ? `${daysRemaining}`
                  : "Past due"
            }
          />
        </div>
      </section>
    </div>
  );
}

function SignalList({
  eyebrow,
  title,
  icon: Icon,
  empty,
  items,
}: {
  eyebrow: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  empty: string;
  items: { id: string; code: string; title: string; detail: string }[];
}) {
  return (
    <section>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold">
        <Icon className="size-4" />
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="border-border text-muted-foreground mt-4 rounded-xl border border-dashed p-5 text-sm">
          {empty}
        </p>
      ) : (
        <div className="divide-border border-border mt-4 divide-y border-y">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/knowledge-map?objective=${item.id}`}
              className="group focus-visible:ring-ring flex min-h-16 items-center gap-3 py-3 focus-visible:ring-2 focus-visible:outline-none"
            >
              <span className="text-primary font-mono text-sm font-bold">
                {item.code}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {item.title}
                </span>
                <span className="text-muted-foreground block truncate text-xs">
                  {item.detail}
                </span>
              </span>
              <ArrowRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="border-border bg-card/50 flex items-center gap-3 rounded-xl border p-4">
      <Icon className="text-primary size-4" />
      <div>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
          {value}
        </p>
      </div>
    </div>
  );
}
