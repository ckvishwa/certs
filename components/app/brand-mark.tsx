import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      aria-label={brand.name}
    >
      <span className="text-primary font-mono text-base font-bold tracking-tight">
        {brand.shortName}
      </span>
      {brand.isTemporary ? (
        <span className="border-primary/30 bg-primary/10 text-primary rounded border px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wide uppercase">
          temporary
        </span>
      ) : null}
    </span>
  );
}
