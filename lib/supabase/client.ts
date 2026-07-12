import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/types/database";

/** Supabase client for use in Client Components (browser). */
export function createClient() {
  return createBrowserClient<Database>(
    publicEnv.supabaseUrl(),
    publicEnv.supabasePublishableKey(),
  );
}
