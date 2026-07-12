/** Loading skeleton for the onboarding step. */
export default function Loading() {
  return (
    <div
      className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-12"
      aria-busy="true"
    >
      <div className="sr-only">Loading…</div>
      <div className="mb-6 h-6 w-32 animate-pulse rounded bg-muted" />
      <div className="h-96 animate-pulse rounded-xl border border-border bg-card" />
    </div>
  );
}
