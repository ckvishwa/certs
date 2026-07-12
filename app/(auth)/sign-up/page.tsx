import { AuthForm } from "@/components/auth/auth-form";
import { signUp } from "../actions";

export default function SignUpPage() {
  return <AuthForm mode="sign-up" action={signUp} />;
}
