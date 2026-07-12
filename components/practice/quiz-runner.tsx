"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X, ArrowRight, Trophy } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MISTAKE_LABELS } from "@/lib/learning/mistake-classify";
import { submitAttempt, type AttemptFeedback } from "@/app/(app)/practice/actions";
import type { QuizQuestion } from "@/lib/db/quiz";

export function QuizRunner({ questions }: { questions: QuizQuestion[] }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<AttemptFeedback | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const startedAt = useRef<number>(0);

  // Reset the response timer whenever a new question is shown.
  useEffect(() => {
    startedAt.current = Date.now();
  }, [index]);

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No questions available yet. Seed curated questions with{" "}
          <code>npm run db:seed</code>.
        </CardContent>
      </Card>
    );
  }

  const done = index >= questions.length;
  if (done) {
    const score = results.filter(Boolean).length;
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <Trophy className="size-8 text-primary" />
          <h2 className="text-xl font-semibold">Quiz complete</h2>
          <p className="text-3xl font-bold tabular-nums">
            {score} / {questions.length}
          </p>
          <p className="text-sm text-muted-foreground">
            Your knowledge map and readiness have been updated.
          </p>
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
      setResults((r) => [...r, fb.isCorrect]);
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
      <div className="flex items-center justify-between text-sm text-muted-foreground">
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
            <p className="text-xs text-muted-foreground">Select all that apply.</p>
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
                  <span className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {choice.label}
                  </span>
                  <span className="flex-1">{choice.body}</span>
                  {showCorrect ? (
                    <Check className="size-4 shrink-0 text-success" />
                  ) : null}
                  {showWrong ? (
                    <X className="size-4 shrink-0 text-destructive" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {!feedback ? (
            <Button
              onClick={onSubmit}
              disabled={selected.length === 0 || submitting}
            >
              {submitting ? "Checking…" : "Submit answer"}
            </Button>
          ) : (
            <Feedback feedback={feedback} onNext={next} last={index + 1 >= questions.length} />
          )}
        </CardContent>
      </Card>
    </div>
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
    <div className="space-y-3 border-t border-border pt-4">
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
          <Badge variant="warning">{MISTAKE_LABELS[feedback.mistakeType]}</Badge>
        ) : null}
      </div>

      {feedback.explanation ? (
        <p className="text-sm">{feedback.explanation}</p>
      ) : null}

      {feedback.examTrap ? (
        <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          Exam trap: {feedback.examTrap}
        </p>
      ) : null}

      <div className="space-y-1.5">
        {feedback.choices
          .filter((c) => c.rationale)
          .map((c) => (
            <p key={c.id} className="text-xs text-muted-foreground">
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

      <Button onClick={onNext} variant={feedback.isCorrect ? "default" : "secondary"}>
        {last ? "See results" : "Next question"}
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
