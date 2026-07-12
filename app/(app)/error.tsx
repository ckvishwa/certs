"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Error boundary scoped to the authenticated app (renders inside the shell). */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-6 py-16 text-center">
      <h1 className="text-lg font-semibold">This section failed to load</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We couldn&apos;t load your data. This is usually temporary or a setup
        issue. Try again in a moment.
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <Button onClick={reset}>Try again</Button>
        <Link
          href="/today"
          className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm hover:bg-accent"
        >
          Back to Today
        </Link>
      </div>
    </div>
  );
}
