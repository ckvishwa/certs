"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X, ArrowRight, Trophy } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MISTAKE_LABELS } from "@/lib/learning/mistake-classify";
import {
  submitAttempt,
  type AttemptFeedback,
} from "@/app/(app)/practice/actions";
import type { QuizQuestion } from "@/lib/db/quiz";

export function QuizRunner({ questions }: { questions: QuizQuestion[] }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<AttemptFeedback | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AttemptFeedback[]>([]);
  const startedAt = useRef<number>(0);

  // Reset the response timer whenever a new question is shown.
  useEffect(() => {
    startedAt.current = Date.now();
  }, [index]);

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-center text-sm">
          No questions available yet. Seed curated questions with{" "}
          <code>npm run db:seed</code>.
        </CardContent>
      </Card>
    );
  }

  const done = index >= questions.length;
  if (done) {
    const score = results.filter((result) => result.isCorrect).length;
    const demonstrated = results.flatMap((result) =>
      result.conceptChanges.filter(
        (change) => change.direction === "demonstrated",
      ),
    );
    const weakened = results.flatMap((result) =>
      result.conceptChanges.filter((change) => change.direction === "weakened"),
    );
    const mistakeTypes = results
      .map((result) => result.mistakeType)
      .filter((type): type is NonNullable<typeof type> => type !== null);
    const prerequisiteGaps = [
      ...new Set(results.flatMap((result) => result.prerequisiteGaps)),
    ];
    const recommendedObjectives = [
      ...new Map(
        results
          .filter((result) => !result.isCorrect && result.objectiveCode)
          .map((result) => [result.objectiveCode, result.objectiveTitle]),
      ).entries(),
    ];
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <Trophy className="text-primary size-8" />
          <h2 className="text-xl font-semibold">Quiz complete</h2>
          <p className="text-3xl font-bold tabular-nums">
            {score} / {questions.length}
          </p>
          <p className="text-muted-foreground text-sm">
            Persisted learner evidence is reflected in your heatmaps on refresh.
          </p>
          <div className="mt-3 grid w-full gap-3 text-left sm:grid-cols-2">
            <ResultGroup
              title="Concepts demonstrated"
              values={[...new Set(demonstrated.map((change) => change.name))]}
              empty="No positive mastery movement."
            />
            <ResultGroup
              title="Concepts weakened"
              values={[...new Set(weakened.map((change) => change.name))]}
              empty="No concepts weakened."
            />
            <ResultGroup
              title="Mistake classifications"
              values={mistakeTypes.map((type) => MISTAKE_LABELS[type])}
              empty="No classified mistakes."
            />
            <ResultGroup
              title="Prerequisite gaps"
              values={prerequisiteGaps}
              empty="No prerequisite gaps detected."
            />
            <ResultGroup
              title="Top recommended objectives"
              values={recommendedObjectives.map(
                ([code, title]) => `${code}: ${title ?? "Objective review"}`,
              )}
              empty="Continue mixed recall."
            />
            <ResultGroup
              title="Heatmap changes"
              values={results.flatMap((result) =>
                result.conceptChanges
                  .filter((change) => change.direction !== "unchanged")
                  .map(
                    (change) =>
                      `${change.name}: ${Math.round(change.before * 100)}% → ${Math.round(change.after * 100)}%`,
                  ),
              )}
              empty="No mastery values changed."
            />
          </div>
          <div className="mt-2 flex gap-2">
            <Button onClick={() => location.reload()}>New quiz</Button>
            <a
              href="/knowledge-map"
              className={buttonVariants({ variant: "outline" })}
            >
              View knowledge map
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  const q = questions[index];
  const isMulti = q.kind === "MULTI";

  function toggle(choiceId: string) {
    if (feedback) return;
    setSelected((prev) =>
      isMulti
        ? prev.includes(choiceId)
          ? prev.filter((x) => x !== choiceId)
          : [...prev, choiceId]
        : [choiceId],
    );
  }

  async function onSubmit() {
    if (selected.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const fb = await submitAttempt({
        questionId: q.id,
        selectedChoiceIds: selected,
        responseMs: Date.now() - startedAt.current,
      });
      setFeedback(fb);
      setResults((results) => [...results, fb]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    setFeedback(null);
    setSelected([]);
    setError(null);
    setIndex((i) => i + 1);
  }

  const correctSet = new Set(feedback?.correctChoiceIds ?? []);

  return (
    <div className="space-y-4">
      <div className="text-muted-foreground flex items-center justify-between text-sm">
        <span>
          Question {index + 1} of {questions.length}
        </span>
        <div className="flex items-center gap-2">
          {q.objectiveTitle ? (
            <span className="max-w-[280px] truncate">{q.objectiveTitle}</span>
          ) : null}
          <Badge variant="outline">Difficulty {q.difficulty}/5</Badge>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 py-6">
          <p className="text-base font-medium">{q.stem}</p>
          {isMulti ? (
            <p className="text-muted-foreground text-xs">
              Select all that apply.
            </p>
          ) : null}

          <div className="space-y-2">
            {q.choices.map((choice) => {
              const isSelected = selected.includes(choice.id);
              const showCorrect = feedback && correctSet.has(choice.id);
              const showWrong =
                feedback && isSelected && !correctSet.has(choice.id);
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => toggle(choice.id)}
                  disabled={!!feedback}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
                    !feedback && isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border",
                    !feedback && !isSelected && "hover:bg-accent",
                    showCorrect && "border-success/60 bg-success/10",
                    showWrong && "border-destructive/60 bg-destructive/10",
                  )}
                >
                  <span className="text-muted-foreground mt-0.5 font-mono text-xs">
                    {choice.label}
                  </span>
                  <span className="flex-1">{choice.body}</span>
                  {showCorrect ? (
                    <Check className="text-success size-4 shrink-0" />
                  ) : null}
                  {showWrong ? (
                    <X className="text-destructive size-4 shrink-0" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {error ? <p className="text-destructive text-sm">{error}</p> : null}

          {!feedback ? (
            <Button
              onClick={onSubmit}
              disabled={selected.length === 0 || submitting}
            >
              {submitting ? "Checking…" : "Submit answer"}
            </Button>
          ) : (
            <Feedback
              feedback={feedback}
              onNext={next}
              last={index + 1 >= questions.length}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ResultGroup({
  title,
  values,
  empty,
}: {
  title: string;
  values: string[];
  empty: string;
}) {
  return (
    <section className="border-border bg-background/50 rounded-lg border p-3">
      <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {title}
      </h3>
      <p className="mt-1 text-sm">
        {values.length > 0 ? [...new Set(values)].join(", ") : empty}
      </p>
    </section>
  );
}

function Feedback({
  feedback,
  onNext,
  last,
}: {
  feedback: AttemptFeedback;
  onNext: () => void;
  last: boolean;
}) {
  return (
    <div className="border-border space-y-3 border-t pt-4">
      <div className="flex items-center gap-2">
        {feedback.isCorrect ? (
          <Badge variant="success">
            <Check className="size-3.5" /> Correct
          </Badge>
        ) : (
          <Badge variant="destructive">
            <X className="size-3.5" /> Incorrect
          </Badge>
        )}
        {!feedback.isCorrect && feedback.mistakeType ? (
          <Badge variant="warning">
            {MISTAKE_LABELS[feedback.mistakeType]}
          </Badge>
        ) : null}
      </div>

      {feedback.explanation ? (
        <p className="text-sm">{feedback.explanation}</p>
      ) : null}

      {feedback.examTrap ? (
        <p className="border-warning/30 bg-warning/10 text-warning rounded-md border px-3 py-2 text-sm">
          Exam trap: {feedback.examTrap}
        </p>
      ) : null}

      <div className="space-y-1.5">
        {feedback.choices
          .filter((c) => c.rationale)
          .map((c) => (
            <p key={c.id} className="text-muted-foreground text-xs">
              <span
                className={cn(
                  "font-mono font-semibold",
                  c.isCorrect ? "text-success" : "text-foreground",
                )}
              >
                {c.label}
              </span>{" "}
              {c.rationale}
            </p>
          ))}
      </div>

      <Button
        onClick={onNext}
        variant={feedback.isCorrect ? "default" : "secondary"}
      >
        {last ? "See results" : "Next question"}
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
