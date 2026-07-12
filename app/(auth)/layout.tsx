import Link from "next/link";
import type { Metadata } from "next";
import { BrandMark } from "@/components/app/brand-mark";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Account" };

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <BrandMark className="text-lg" />
        </Link>
        {children}
        <p className="text-muted-foreground mt-8 text-center text-xs">
          {brand.tagline}
        </p>
      </div>
    </div>
  );
}
