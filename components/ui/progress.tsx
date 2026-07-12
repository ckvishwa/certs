import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.ComponentProps<"div"> {
  /** 0–100 */
  value?: number;
  /** CSS color for the filled portion (defaults to primary). */
  indicatorColor?: string;
}

function Progress({
  value = 0,
  indicatorColor,
  className,
  ...props
}: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
      {...props}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${clamped}%`,
          background: indicatorColor ?? "var(--primary)",
        }}
      />
    </div>
  );
}

export { Progress };
