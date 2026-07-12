"use client";

import { useState } from "react";
import { Sparkles, ChevronDown } from "lucide-react";
import { STATE_DISPLAY } from "@/lib/learning/state-display";
import { masteryColor } from "@/lib/learning/state-display";
import type { LearnerState } from "@/lib/types/database";

interface Explanation {
  hook: string;
  mentalModel: string;
  simple: string;
  technical: string;
  examTraps: string[];
  memoryHook: string;
  recallQuestion: { question: string; answer: string };
}

export function ConceptItem({
  id,
  name,
  state,
  mastery,
  isPlaceholder,
}: {
  id: string;
  name: string;
  state: LearnerState;
  mastery: number;
  isPlaceholder: boolean;
}) {
  const display = STATE_DISPLAY[state];
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Explanation | null>(null);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !data && !loading) {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/ai/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conceptId: id }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to explain");
        setData(json.explanation as Explanation);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to explain");
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="rounded-md border border-border/60 bg-background/40">
      <div className="flex items-center gap-3 px-3 py-2">
        <span
          aria-hidden
          className="text-sm"
          style={{ color: display.colorVar }}
        >
          {display.glyph}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{name}</span>
            {isPlaceholder ? (
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
                  width: `${Math.max(2, mastery)}%`,
                  background: masteryColor(mastery),
                }}
              />
            </div>
            <span className="text-[11px] text-muted-foreground">
              {display.label} · {Math.round(mastery)}%
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/10"
        >
          <Sparkles className="size-3.5" />
          Explain
          <ChevronDown
            className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {open ? (
        <div className="border-t border-border/60 px-3 py-3 text-sm">
          {loading ? (
            <p className="text-muted-foreground">Generating explanation…</p>
          ) : error ? (
            <p className="text-destructive">{error}</p>
          ) : data ? (
            <div className="space-y-2">
              <p className="italic text-muted-foreground">{data.hook}</p>
              <Field label="Mental model" value={data.mentalModel} />
              <Field label="Simple" value={data.simple} />
              <Field label="Technical" value={data.technical} />
              <div>
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Exam traps
                </span>
                <ul className="mt-1 list-disc pl-5 text-sm">
                  {data.examTraps.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
              <Field label="Memory hook" value={data.memoryHook} />
              <Field
                label="Recall check"
                value={`${data.recallQuestion.question} — ${data.recallQuestion.answer}`}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </span>
      <p className="text-sm">{value}</p>
    </div>
  );
}
