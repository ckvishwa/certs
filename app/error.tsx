"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Global error boundary for route segments. Keeps a crash from showing a blank
 * screen; offers a retry and a way back. (Does not catch root-layout errors —
 * that would need app/global-error.tsx.)
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for local debugging; replace with real telemetry later.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        An unexpected error occurred. This is often a configuration issue (for
        example, Supabase environment variables not set). You can retry or head
        home.
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm hover:bg-accent"
        >
          Go home
        </Link>
      </div>
      {error.digest ? (
        <p className="font-mono text-xs text-muted-foreground">
          Ref: {error.digest}
        </p>
      ) : null}
    </div>
  );
}
