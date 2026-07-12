"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Network,
  BookOpen,
  Repeat,
  Target,
  ClipboardCheck,
  TriangleAlert,
  ChartBar,
  Library,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/(auth)/actions";
import { BrandMark } from "@/components/app/brand-mark";
import { brand } from "@/lib/brand";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  ready: boolean;
}

const NAV: NavItem[] = [
  { href: "/today", label: "Today", icon: LayoutDashboard, ready: true },
  {
    href: "/knowledge-map",
    label: "Knowledge Map",
    icon: Network,
    ready: true,
  },
  { href: "/learn", label: "Learn", icon: BookOpen, ready: false },
  { href: "/review", label: "Review", icon: Repeat, ready: false },
  { href: "/practice", label: "Practice", icon: Target, ready: false },
  { href: "/mock", label: "Mock Exams", icon: ClipboardCheck, ready: false },
  { href: "/mistakes", label: "Mistakes", icon: TriangleAlert, ready: false },
  { href: "/analytics", label: "Analytics", icon: ChartBar, ready: false },
  { href: "/library", label: "Library", icon: Library, ready: false },
];

function useActive(pathname: string) {
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ displayName }: { displayName: string }) {
  const pathname = usePathname();
  const isActive = useActive(pathname);

  return (
    <>
      {/* Mobile top bar */}
      <header className="border-border bg-card/40 flex items-center gap-3 border-b px-4 py-2 md:hidden">
        <BrandMark />
        <nav
          aria-label={`${brand.shortName} primary navigation`}
          className="flex flex-1 items-center gap-1 overflow-x-auto"
        >
          {NAV.filter((i) => i.ready).map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors",
                  active
                    ? "bg-primary/15 text-primary font-medium"
                    : "text-foreground/80 hover:bg-accent",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form action={signOut}>
          <button
            type="submit"
            aria-label="Sign out"
            className="text-foreground/80 hover:bg-accent flex items-center rounded-md p-2 transition-colors"
          >
            <LogOut className="size-4" />
          </button>
        </form>
      </header>

      {/* Desktop sidebar */}
      <aside className="border-border bg-card/40 hidden w-60 shrink-0 flex-col border-r md:flex">
        <div className="border-border flex h-14 items-center border-b px-4">
          <BrandMark />
        </div>

        <nav
          aria-label={`${brand.shortName} primary navigation`}
          className="flex-1 space-y-0.5 overflow-y-auto p-2"
        >
          {NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            if (!item.ready) {
              return (
                <div
                  key={item.href}
                  className="text-muted-foreground/50 flex items-center justify-between rounded-md px-3 py-2 text-sm"
                  title="Coming in a later slice"
                >
                  <span className="flex items-center gap-3">
                    <Icon className="size-4" />
                    {item.label}
                  </span>
                  <span className="bg-muted rounded px-1.5 py-0.5 text-[10px] font-medium">
                    soon
                  </span>
                </div>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/15 text-primary font-medium"
                    : "text-foreground/80 hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-border border-t p-2">
          <div className="text-muted-foreground px-3 py-2 text-xs">
            Signed in as
            <div className="text-foreground truncate font-medium">
              {displayName}
            </div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="text-foreground/80 hover:bg-accent hover:text-foreground flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
