"use client";

import { useState } from "react";
import {
  Activity,
  ArrowRight,
  CircleCheck,
  Clock3,
  EyeOff,
  Link2,
  TriangleAlert,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { KMDomain, KMObjective } from "@/lib/db/knowledge-map";
import type { ObjectiveMasteryState } from "@/lib/learning/objective-mastery";

const STATE_META: Record<
  ObjectiveMasteryState,
  {
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  unseen: {
    label: "Unseen",
    description: "No concepts attempted",
    icon: EyeOff,
  },
  weak: {
    label: "Weak",
    description: "Low mastery or repeated weakness",
    icon: TriangleAlert,
  },
  developing: {
    label: "Developing",
    description: "Evidence is improving but incomplete",
    icon: Activity,
  },
  mastered: {
    label: "Mastered",
    description: "Sustained mastery across the objective",
    icon: CircleCheck,
  },
  due_for_review: {
    label: "Due for review",
    description: "At least one concept needs review",
    icon: Clock3,
  },
};

export function ObjectiveMasteryHeatmap({
  domains,
  initialObjectiveId,
  heading = "Objective mastery",
}: {
  domains: KMDomain[];
  initialObjectiveId?: string;
  heading?: string;
}) {
  const objectives = domains.flatMap((domain) => domain.objectives);
  const initial =
    objectives.find((objective) => objective.id === initialObjectiveId) ??
    objectives[0] ??
    null;
  const [selectedId, setSelectedId] = useState<string | null>(
    initial?.id ?? null,
  );
  const selected =
    objectives.find((objective) => objective.id === selectedId) ?? null;

  return (
    <section id="objective-mastery" aria-labelledby="objective-mastery-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Mastery signal</p>
          <h2
            id="objective-mastery-title"
            className="mt-1 text-xl font-semibold"
          >
            {heading}
          </h2>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Every objective is calculated from persisted concept attempts,
            mastery, and review dates.
          </p>
        </div>
        <span className="text-muted-foreground font-mono text-xs">
          {objectives.length} objectives
        </span>
      </div>

      <MasteryLegend />

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          {domains.map((domain) => (
            <section key={domain.id} aria-labelledby={`domain-${domain.id}`}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h3
                  id={`domain-${domain.id}`}
                  className="text-sm font-semibold"
                >
                  <span className="text-muted-foreground mr-2 font-mono text-xs">
                    {domain.code}
                  </span>
                  {domain.title}
                </h3>
                <span className="text-muted-foreground font-mono text-xs">
                  {Math.round(domain.mastery)}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {domain.objectives.map((objective) => (
                  <ObjectiveCell
                    key={objective.id}
                    objective={objective}
                    selected={selected?.id === objective.id}
                    onSelect={() => setSelectedId(objective.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        {selected ? (
          <ObjectiveDetails
            objective={selected}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <div className="border-border text-muted-foreground rounded-xl border border-dashed p-6 text-sm">
            Select an objective to inspect its concepts and evidence.
          </div>
        )}
      </div>
    </section>
  );
}

function MasteryLegend() {
  return (
    <div
      className="mt-4 flex flex-wrap gap-2"
      aria-label="Objective mastery legend"
    >
      {(
        Object.entries(STATE_META) as [
          ObjectiveMasteryState,
          (typeof STATE_META)[ObjectiveMasteryState],
        ][]
      ).map(([state, meta]) => {
        const Icon = meta.icon;
        return (
          <span
            key={state}
            className="mastery-legend-item"
            data-state={state}
            title={meta.description}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}

function ObjectiveCell({
  objective,
  selected,
  onSelect,
}: {
  objective: KMObjective;
  selected: boolean;
  onSelect: () => void;
}) {
  const meta = STATE_META[objective.masteryState];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      className={cn("mastery-cell", selected && "ring-ring ring-2")}
      data-state={objective.masteryState}
      aria-pressed={selected}
      aria-label={`${objective.code} ${objective.title}. ${meta.label}. ${Math.round(objective.mastery)} percent mastery. ${objective.masteredConcepts} of ${objective.totalConcepts} concepts mastered. ${objective.recentMistakes.length} recent mistakes. ${objective.reviewDue ? "Review due." : "No review due."} ${objective.recommendedAction}`}
      onClick={onSelect}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-bold">{objective.code}</span>
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="line-clamp-2 min-h-9 text-left text-xs leading-4 font-medium">
        {objective.title}
      </span>
      <span className="flex items-end justify-between gap-2">
        <span className="text-[11px] font-medium">{meta.label}</span>
        <span className="font-mono text-lg font-bold tabular-nums">
          {Math.round(objective.mastery)}%
        </span>
      </span>
      <span className="text-left text-[10px] opacity-80">
        {objective.masteredConcepts}/{objective.totalConcepts} mastered
        {objective.recentMistakes.length > 0
          ? ` · ${objective.recentMistakes.length} mistakes`
          : ""}
      </span>
    </button>
  );
}

function ObjectiveDetails({
  objective,
  onClose,
}: {
  objective: KMObjective;
  onClose: () => void;
}) {
  const meta = STATE_META[objective.masteryState];
  const weakConcepts = objective.concepts.filter(
    (concept) => concept.attemptCount > 0 && concept.mastery < 55,
  );

  return (
    <aside
      className="objective-detail-panel xl:sticky xl:top-6 xl:self-start"
      aria-labelledby="objective-detail-title"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground font-mono text-xs">
            Objective {objective.code}
          </p>
          <h3 id="objective-detail-title" className="mt-1 font-semibold">
            {objective.title}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring rounded-md p-2 focus-visible:ring-2 focus-visible:outline-none"
          aria-label="Close objective details"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Metric label="Mastery" value={`${Math.round(objective.mastery)}%`} />
        <Metric
          label="Mastered"
          value={`${objective.masteredConcepts}/${objective.totalConcepts}`}
        />
        <Metric label="Mistakes" value={`${objective.recentMistakes.length}`} />
      </div>

      <div className="border-border bg-background/50 mt-4 rounded-lg border p-3">
        <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Next action
        </p>
        <p className="mt-1 text-sm font-medium">
          {objective.recommendedAction}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">{meta.description}</p>
      </div>

      <DetailSection title="Concept mastery">
        <div className="space-y-2">
          {objective.concepts.map((concept) => (
            <div
              key={concept.id}
              className="grid grid-cols-[1fr_auto] gap-3 text-xs"
            >
              <span
                className={cn(
                  concept.mastery < 55 &&
                    concept.attemptCount > 0 &&
                    "text-[var(--mastery-weak)]",
                )}
              >
                {concept.name}
              </span>
              <span className="text-muted-foreground font-mono tabular-nums">
                {Math.round(concept.mastery)}%
              </span>
            </div>
          ))}
        </div>
      </DetailSection>

      <DetailSection title="Weak concepts">
        <p className="text-muted-foreground text-xs">
          {weakConcepts.length > 0
            ? weakConcepts.map((concept) => concept.name).join(", ")
            : "No attempted concepts are currently below 55%."}
        </p>
      </DetailSection>

      <DetailSection title="Prerequisite gaps">
        {objective.prerequisiteGaps.length > 0 ? (
          <div className="space-y-2">
            {objective.prerequisiteGaps.map((gap) => (
              <p
                key={`${gap.conceptId}-${gap.prerequisiteId}`}
                className="flex gap-2 text-xs"
              >
                <Link2 className="mt-0.5 size-3.5 shrink-0 text-[var(--mastery-review-due)]" />
                <span>
                  {gap.conceptName} requires {gap.prerequisiteName} (
                  {Math.round(gap.prerequisiteMastery)}%).
                </span>
              </p>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            No unresolved prerequisite gaps.
          </p>
        )}
      </DetailSection>

      <DetailSection title="Recent incorrect attempts">
        {objective.recentMistakes.length > 0 ? (
          <div className="space-y-2">
            {objective.recentMistakes.slice(0, 4).map((mistake) => (
              <p key={mistake.id} className="text-muted-foreground text-xs">
                {mistake.questionStem ??
                  mistake.conceptName ??
                  "Incorrect attempt"}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            No incorrect attempts in the last 90 days.
          </p>
        )}
      </DetailSection>

      <a
        href={`/knowledge-map?objective=${objective.id}`}
        className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
      >
        Focus this objective
        <ArrowRight className="size-4" />
      </a>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/60 rounded-lg px-2 py-3">
      <div className="font-mono text-lg font-bold tabular-nums">{value}</div>
      <div className="text-muted-foreground text-[10px] tracking-wide uppercase">
        {label}
      </div>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border mt-4 border-t pt-4">
      <h4 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
        {title}
      </h4>
      {children}
    </section>
  );
}
