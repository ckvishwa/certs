import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/types/database";

export class BearerAuthError extends Error {
  readonly code = "UNAUTHORIZED" as const;
  constructor(message = "Authentication required") {
    super(message);
  }
}

/** Extracts the raw token from an `Authorization: Bearer <token>` header, or null. */
export function extractBearerToken(request: Request): string | null {
  const header =
    request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  return token && token.length > 0 ? token : null;
}

export interface BearerAuthResult {
  db: SupabaseClient<Database>;
  userId: string;
}

/**
 * Verifies a mobile client's Supabase JWT and returns a client scoped to that
 * user. The client forwards the caller's token on every request, so Postgres
 * RLS (auth.uid()) is the real ownership boundary — same model every other
 * Certs route/action already relies on. No service-role key is used here, so
 * this can never bypass RLS.
 */
export async function authenticateBearerRequest(
  request: Request,
): Promise<BearerAuthResult> {
  const token = extractBearerToken(request);
  if (!token) throw new BearerAuthError();

  const db = createSupabaseClient<Database>(
    publicEnv.supabaseUrl(),
    publicEnv.supabasePublishableKey(),
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    },
  );

  const {
    data: { user },
    error,
  } = await db.auth.getUser(token);
  if (error || !user) throw new BearerAuthError();

  return { db, userId: user.id };
}
