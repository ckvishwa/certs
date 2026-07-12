"use client";

import { useState } from "react";
import { ArrowRight, Grid3X3, Network } from "lucide-react";
import { ObjectiveMasteryHeatmap } from "@/components/heatmaps/objective-mastery-heatmap";
import type { KnowledgeMap } from "@/lib/db/knowledge-map";
import { cn } from "@/lib/utils";

type View = "mastery" | "dependencies";

export function KnowledgeMapWorkspace({
  map,
  initialObjectiveId,
}: {
  map: KnowledgeMap;
  initialObjectiveId?: string;
}) {
  const [view, setView] = useState<View>("mastery");

  return (
    <>
      <div
        className="border-border bg-card mb-6 inline-flex rounded-lg border p-1"
        aria-label="Knowledge map view"
      >
        <ViewButton
          active={view === "mastery"}
          onClick={() => setView("mastery")}
          icon={Grid3X3}
        >
          Mastery view
        </ViewButton>
        <ViewButton
          active={view === "dependencies"}
          onClick={() => setView("dependencies")}
          icon={Network}
        >
          Dependency view
        </ViewButton>
      </div>

      {view === "mastery" ? (
        <ObjectiveMasteryHeatmap
          domains={map.domains}
          initialObjectiveId={initialObjectiveId}
          heading="Certification mastery map"
        />
      ) : (
        <DependencyView map={map} />
      )}
    </>
  );
}

function ViewButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "focus-visible:ring-ring inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none",
        active
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {children}
    </button>
  );
}

function DependencyView({ map }: { map: KnowledgeMap }) {
  const conceptObjective = new Map(
    map.domains.flatMap((domain) =>
      domain.objectives.flatMap((objective) =>
        objective.concepts.map((concept) => [concept.id, objective] as const),
      ),
    ),
  );

  return (
    <section aria-labelledby="dependency-view-title">
      <p className="eyebrow">Prerequisite graph</p>
      <h2 id="dependency-view-title" className="mt-1 text-xl font-semibold">
        Concept dependencies
      </h2>
      <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
        Kept separate from mastery so prerequisite relationships remain
        readable.
      </p>

      {map.dependencies.length === 0 ? (
        <div className="border-border text-muted-foreground mt-5 rounded-xl border border-dashed p-8 text-sm">
          No dependency relationships are defined for this certification
          version.
        </div>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {map.dependencies.map((dependency) => {
            const objective = conceptObjective.get(dependency.conceptId);
            return (
              <div
                key={`${dependency.conceptId}-${dependency.prerequisiteId}`}
                className="border-border bg-card rounded-xl border p-4"
              >
                <p className="text-muted-foreground font-mono text-[10px] tracking-wide uppercase">
                  Objective {objective?.code ?? "-"}
                </p>
                <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
                  <span className="bg-muted rounded-md px-2 py-2 font-medium">
                    {dependency.prerequisiteName}
                  </span>
                  <ArrowRight
                    className="text-primary size-4"
                    aria-label="is required by"
                  />
                  <span className="border-border rounded-md border px-2 py-2 font-medium">
                    {dependency.conceptName}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
