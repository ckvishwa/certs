import { createClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/lib/types/database";

/**
 * Service-role client. Bypasses RLS — SERVER ONLY. Never import from a Client
 * Component. Used by seed scripts and privileged admin tasks.
 */
export function createAdminClient() {
  return createClient<Database>(
    publicEnv.supabaseUrl(),
    serverEnv.supabaseServiceRoleKey(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
