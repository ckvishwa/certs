/** Loading skeleton shown while an authenticated page's data resolves. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10" aria-busy="true">
      <div className="sr-only">Loading…</div>
      <div className="h-7 w-64 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-4 w-80 animate-pulse rounded bg-muted" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-border bg-card"
            />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-xl border border-border bg-card" />
          <div className="h-40 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      </div>
    </div>
  );
}
