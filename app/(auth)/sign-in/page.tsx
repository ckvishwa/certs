import { AuthForm } from "@/components/auth/auth-form";
import { signIn } from "../actions";

const NOTICES: Record<string, string> = {
  confirm:
    "That confirmation link was invalid or expired. Please sign in, or request a new link.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const { redirect, error } = await searchParams;
  const initialNotice = error ? NOTICES[error] : undefined;
  return (
    <AuthForm
      mode="sign-in"
      action={signIn}
      redirectTo={redirect}
      initialNotice={initialNotice}
    />
  );
}
