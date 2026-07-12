"use client";

import { useState } from "react";
import { AlertTriangle, Search } from "lucide-react";
import {
  aggregateMistakeHeatmap,
  MISTAKE_TAXONOMY,
  MISTAKE_TAXONOMY_LABELS,
  type HeatmapMistake,
} from "@/lib/learning/mistake-heatmap";
import type { MistakeTaxonomy } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const RANGES = [7, 30, 90] as const;

export function MistakePatternHeatmap({
  objectives,
  mistakes,
}: {
  objectives: { id: string; code: string; title: string }[];
  mistakes: HeatmapMistake[];
}) {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [selected, setSelected] = useState<{
    objectiveId: string;
    type: MistakeTaxonomy;
  } | null>(null);
  const since = new Date();
  since.setDate(since.getDate() - days);
  const rows = aggregateMistakeHeatmap(objectives, mistakes, since);
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const selectedMistakes = selected
    ? mistakes.filter(
        (mistake) =>
          mistake.objectiveId === selected.objectiveId &&
          mistake.type === selected.type &&
          new Date(mistake.createdAt) >= since,
      )
    : [];

  return (
    <section aria-labelledby="mistake-pattern-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Error evidence</p>
          <h2 id="mistake-pattern-title" className="mt-1 text-xl font-semibold">
            Mistake patterns
          </h2>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Only explicitly classified incorrect attempts appear here.
          </p>
        </div>
        <div
          className="border-border flex rounded-lg border p-1"
          aria-label="Mistake date range"
        >
          {RANGES.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setDays(range)}
              aria-pressed={days === range}
              className={cn(
                "focus-visible:ring-ring min-h-9 rounded-md px-3 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none",
                days === range
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {range} days
            </button>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <div className="border-border mt-4 rounded-xl border border-dashed p-8 text-center">
          <Search className="text-muted-foreground mx-auto size-5" />
          <p className="mt-2 text-sm font-medium">
            No classified mistakes in this range
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Unclassified and historical legacy categories are intentionally not
            inferred.
          </p>
        </div>
      ) : (
        <>
          {total < 3 ? (
            <div className="mt-4 flex gap-2 rounded-lg border border-[var(--mastery-review-due)]/40 bg-[var(--mastery-review-due-surface)] p-3 text-xs">
              <AlertTriangle className="size-4 shrink-0" />
              Low-data view: patterns become more reliable after several
              classified attempts.
            </div>
          ) : null}
          <div className="border-border mt-4 overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[760px] border-collapse text-left text-xs">
              <caption className="sr-only">
                Classified mistake frequency by objective and mistake type
              </caption>
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th
                    scope="col"
                    className="bg-muted sticky left-0 z-10 min-w-56 px-3 py-3 font-medium"
                  >
                    Objective
                  </th>
                  {MISTAKE_TAXONOMY.map((type) => (
                    <th
                      key={type}
                      scope="col"
                      className="min-w-24 px-2 py-3 text-center font-medium"
                    >
                      {MISTAKE_TAXONOMY_LABELS[type]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows
                  .filter((row) => row.total > 0)
                  .map((row) => (
                    <tr
                      key={row.objectiveId}
                      className="border-border border-t"
                    >
                      <th
                        scope="row"
                        className="bg-card sticky left-0 z-10 px-3 py-2 font-medium"
                      >
                        <span className="text-muted-foreground mr-2 font-mono">
                          {row.objectiveCode}
                        </span>
                        {row.objectiveTitle}
                      </th>
                      {MISTAKE_TAXONOMY.map((type) => {
                        const count = row.counts[type];
                        const active =
                          selected?.objectiveId === row.objectiveId &&
                          selected.type === type;
                        return (
                          <td key={type} className="p-1 text-center">
                            <button
                              type="button"
                              disabled={count === 0}
                              onClick={() =>
                                setSelected({
                                  objectiveId: row.objectiveId,
                                  type,
                                })
                              }
                              className={cn(
                                "mistake-cell",
                                active && "ring-ring ring-2",
                              )}
                              data-severity={Math.min(count, 4)}
                              aria-label={`${row.objectiveCode} ${MISTAKE_TAXONOMY_LABELS[type]}: ${count}`}
                            >
                              {count}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selected ? (
        <div
          className="border-border bg-card mt-4 rounded-xl border p-4"
          aria-live="polite"
        >
          <h3 className="text-sm font-semibold">
            {MISTAKE_TAXONOMY_LABELS[selected.type]} evidence
          </h3>
          <div className="mt-3 space-y-2">
            {selectedMistakes.map((mistake) => (
              <div
                key={mistake.id}
                className="bg-background/60 rounded-lg p-3 text-xs"
              >
                <p className="font-medium">
                  {mistake.questionStem ?? "Incorrect attempt"}
                </p>
                {mistake.conceptName ? (
                  <p className="text-muted-foreground mt-1">
                    {mistake.conceptName}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
