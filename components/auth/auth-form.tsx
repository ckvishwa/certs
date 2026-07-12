"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthActionState } from "@/app/(auth)/actions";
import { brand } from "@/lib/brand";

type Action = (
  prev: AuthActionState,
  formData: FormData,
) => Promise<AuthActionState>;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Please wait…" : label}
    </Button>
  );
}

export function AuthForm({
  mode,
  action,
  redirectTo,
  initialNotice,
}: {
  mode: "sign-in" | "sign-up";
  action: Action;
  redirectTo?: string;
  /** Server-provided notice (e.g. from a ?error= param). */
  initialNotice?: string;
}) {
  const [state, formAction] = useActionState<AuthActionState, FormData>(
    action,
    { error: null },
  );
  const isSignUp = mode === "sign-up";
  const notice = state.notice ?? initialNotice ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          {isSignUp ? "Create your account" : "Welcome back"}
        </CardTitle>
        <CardDescription>
          {isSignUp
            ? `Start building your certification readiness with ${brand.shortName}.`
            : "Sign in to continue your study plan."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {redirectTo ? (
            <input type="hidden" name="redirectTo" value={redirectTo} />
          ) : null}
          {isSignUp ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                name="displayName"
                autoComplete="name"
                placeholder="Vishva"
              />
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete={isSignUp ? "new-password" : "current-password"}
              placeholder="••••••••"
            />
          </div>

          {state.error ? (
            <p
              role="alert"
              className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
            >
              {state.error}
            </p>
          ) : null}

          {notice ? (
            <p
              role="status"
              className="border-primary/40 bg-primary/10 text-primary rounded-md border px-3 py-2 text-sm"
            >
              {notice}
            </p>
          ) : null}

          <SubmitButton label={isSignUp ? "Create account" : "Sign in"} />
        </form>

        <p className="text-muted-foreground mt-6 text-center text-sm">
          {isSignUp
            ? "Already have an account? "
            : `New to ${brand.shortName}? `}
          <Link
            href={isSignUp ? "/sign-in" : "/sign-up"}
            className="text-primary font-medium hover:underline"
          >
            {isSignUp ? "Sign in" : "Create one"}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
