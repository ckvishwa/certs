import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getActiveStudyPlan } from "@/lib/db/study-plan";
import { getCertificationsWithVersions } from "@/lib/db/certifications";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { BrandMark } from "@/components/app/brand-mark";

export const metadata: Metadata = { title: "Set up your study plan" };

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
      <BrandMark className="mb-6" />
      {certs.length === 0 ? (
        <p className="border-warning/40 bg-warning/10 text-warning rounded-md border px-4 py-3 text-sm">
          No certifications found. Seed the syllabus first with{" "}
          <code>npm run db:seed</code>.
        </p>
      ) : (
        <OnboardingForm certs={certs} />
      )}
    </div>
  );
}
