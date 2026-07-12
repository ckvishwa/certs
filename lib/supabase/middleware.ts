import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/types/database";

/** Route groups that require an authenticated user. */
const PROTECTED_PREFIXES = ["/today", "/knowledge-map", "/learn", "/review", "/practice", "/mistakes", "/library", "/onboarding"];

const AUTH_ROUTES = ["/sign-in", "/sign-up"];

/**
 * Refreshes the Supabase session on every request and gates protected routes.
 * Invoked from the root `proxy.ts` (Next 16's renamed middleware).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Without Supabase env configured we cannot refresh or gate sessions. Rather
  // than crash every request with a 500, pass through so public pages still
  // render (and setup errors surface at the page level).
  if (!publicEnv.isSupabaseConfigured()) {
    return response;
  }

  const supabase = createServerClient<Database>(
    publicEnv.supabaseUrl(),
    publicEnv.supabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() revalidates the token with Supabase; do not remove.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/today";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
