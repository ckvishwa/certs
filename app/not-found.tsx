import Link from "next/link";
import { brand } from "@/lib/brand";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-primary font-mono text-5xl font-bold">404</p>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link
        href="/"
        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold"
      >
        Back to {brand.shortName}
      </Link>
    </div>
  );
}
