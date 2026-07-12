import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveStudyPlan } from "@/lib/db/study-plan";
import { Sidebar } from "@/components/app/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const plan = await getActiveStudyPlan(supabase, user.id);
  if (!plan?.onboarding_complete) redirect("/onboarding");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    profile?.display_name ?? user.email?.split("@")[0] ?? "Learner";

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      <Sidebar displayName={displayName} />
      <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
