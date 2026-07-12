import { redirect } from "next/navigation";
import { formatDistanceToNow, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getMistakes } from "@/lib/db/mistakes";
import { MISTAKE_LABELS } from "@/lib/learning/mistake-classify";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FEATURES } from "@/lib/features";

export default async function MistakesPage() {
  // Frozen for the Foundation release — not reachable by direct URL.
  if (!FEATURES.quiz) redirect("/today");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const summary = await getMistakes(supabase, user.id);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Error log</h1>
        <p className="mt-1 text-muted-foreground">
          Every mistake is data. Here&apos;s why you&apos;ve been missing
          questions.
        </p>
      </header>

      {summary.total === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No mistakes logged yet. Take a{" "}
            <a href="/practice" className="text-primary hover:underline">
              quiz
            </a>{" "}
            — your misses will be classified here.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Insight */}
          {summary.topType ? (
            <Card>
              <CardContent className="py-4 text-sm">
                Your most common mistake type is{" "}
                <span className="font-semibold">
                  {MISTAKE_LABELS[summary.topType]}
                </span>{" "}
                — {Math.round(summary.topShare * 100)}% of your recent misses.
              </CardContent>
            </Card>
          ) : null}

          {/* Breakdown */}
          <div className="flex flex-wrap gap-2">
            {summary.typeCounts.map(({ type, count }) => (
              <Badge key={type} variant="secondary">
                {MISTAKE_LABELS[type]} · {count}
              </Badge>
            ))}
          </div>

          {/* List */}
          <div className="space-y-2">
            {summary.items.map((m) => (
              <Card key={m.id}>
                <CardContent className="flex items-start justify-between gap-4 py-4">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium">
                      {m.questionStem ?? "Question removed"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.conceptName ? `${m.conceptName} · ` : ""}
                      {m.objectiveTitle ?? ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {m.type ? (
                      <Badge variant="warning">{MISTAKE_LABELS[m.type]}</Badge>
                    ) : null}
                    <span className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(parseISO(m.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
