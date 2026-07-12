import { type NextRequest, NextResponse } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/auth/safe-redirect";

/**
 * Email confirmation / OTP callback (Supabase SSR pattern). The confirmation
 * link Supabase emails on sign-up points here with token_hash + type; we verify
 * it to establish a session, then redirect into onboarding. Only needed when
 * "Confirm email" is enabled in the Supabase project.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Only allow same-app relative redirect targets.
  const safeNext = safeInternalPath(searchParams.get("next"), "/onboarding");

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL(safeNext, request.url));
    }
  }

  return NextResponse.redirect(new URL("/sign-in?error=confirm", request.url));
}
