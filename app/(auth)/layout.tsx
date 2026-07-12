import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="font-mono text-lg font-bold tracking-tight text-primary">
            CERTFORGE
          </span>
          <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-xs font-semibold text-primary">
            AI
          </span>
        </Link>
        {children}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Learn → Recall → Apply → Test → Pass
        </p>
      </div>
    </div>
  );
}
