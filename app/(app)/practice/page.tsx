import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveStudyPlan } from "@/lib/db/study-plan";
import { buildQuiz } from "@/lib/db/quiz";
import { QuizRunner } from "@/components/practice/quiz-runner";

export default async function PracticePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const plan = await getActiveStudyPlan(supabase, user.id);
  if (!plan) redirect("/onboarding");

  const questions = await buildQuiz(supabase, plan.exam_version_id, 10);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Mixed quiz</h1>
        <p className="mt-1 text-muted-foreground">
          Interleaved questions across your exam. Every answer updates your
          learner model.
        </p>
      </header>
      <QuizRunner questions={questions} />
    </div>
  );
}
