import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveStudyPlan } from "@/lib/db/study-plan";
import { getCertificationsWithVersions } from "@/lib/db/certifications";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const existing = await getActiveStudyPlan(supabase, user.id);
  if (existing?.onboarding_complete) redirect("/today");

  const certs = await getCertificationsWithVersions(supabase);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-12">
      <div className="mb-6 flex items-center gap-2">
        <span className="font-mono text-lg font-bold tracking-tight text-primary">
          CERTFORGE
        </span>
        <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-xs font-semibold text-primary">
          AI
        </span>
      </div>
      {certs.length === 0 ? (
        <p className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          No certifications found. Seed the syllabus first with{" "}
          <code>npm run db:seed</code>.
        </p>
      ) : (
        <OnboardingForm certs={certs} />
      )}
    </div>
  );
}
