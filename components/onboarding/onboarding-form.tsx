"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  completeOnboarding,
  type OnboardingState,
} from "@/app/onboarding/actions";
import type { CertOption } from "@/lib/db/certifications";
import { brand } from "@/lib/brand";

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Building your plan…" : "Start studying"}
    </Button>
  );
}

export function OnboardingForm({ certs }: { certs: CertOption[] }) {
  const [state, action] = useActionState<OnboardingState, FormData>(
    completeOnboarding,
    { error: null },
  );

  const [certId, setCertId] = useState(certs[0]?.id ?? "");
  const versions = useMemo(
    () => certs.find((c) => c.id === certId)?.versions ?? [],
    [certs, certId],
  );
  const defaultVersion =
    versions.find((v) => v.isActive)?.id ?? versions[0]?.id ?? "";
  const [versionId, setVersionId] = useState(defaultVersion);

  // Keep version valid when certification changes.
  const effectiveVersionId = versions.some((v) => v.id === versionId)
    ? versionId
    : defaultVersion;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Set up your study plan</CardTitle>
        <CardDescription>
          {brand.shortName} builds an adaptive plan from this. You can change it
          later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="certificationId">Certification</Label>
            <select
              id="certificationId"
              name="certificationId"
              className={selectClass}
              value={certId}
              onChange={(e) => setCertId(e.target.value)}
            >
              {certs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.vendor})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="examVersionId">Exam version</Label>
            <select
              id="examVersionId"
              name="examVersionId"
              className={selectClass}
              value={effectiveVersionId}
              onChange={(e) => setVersionId(e.target.value)}
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.isActive ? "" : " — future track"}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="weekdayMinutes">Weekday minutes/day</Label>
              <Input
                id="weekdayMinutes"
                name="weekdayMinutes"
                type="number"
                min={5}
                max={600}
                defaultValue={75}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="weekendMinutes">Weekend minutes/day</Label>
              <Input
                id="weekendMinutes"
                name="weekendMinutes"
                type="number"
                min={0}
                max={600}
                defaultValue={90}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="knowledgeLevel">Current level</Label>
              <select
                id="knowledgeLevel"
                name="knowledgeLevel"
                className={selectClass}
                defaultValue="STRONG"
              >
                <option value="NOVICE">Novice</option>
                <option value="SOME">Some experience</option>
                <option value="STRONG">Strong foundation</option>
                <option value="EXPERT">Expert</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="intensity">Study intensity</Label>
              <select
                id="intensity"
                name="intensity"
                className={selectClass}
                defaultValue="AGGRESSIVE"
              >
                <option value="LIGHT">Light</option>
                <option value="STEADY">Steady</option>
                <option value="AGGRESSIVE">Aggressive</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="targetExamDate">Target exam date (optional)</Label>
            <Input id="targetExamDate" name="targetExamDate" type="date" />
          </div>

          {state.error ? (
            <p
              role="alert"
              className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
            >
              {state.error}
            </p>
          ) : null}

          <Submit />
        </form>
      </CardContent>
    </Card>
  );
}
