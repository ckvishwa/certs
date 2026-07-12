/**
 * Centralised environment access. NEXT_PUBLIC_* vars are referenced via literal
 * `process.env.X` so Next can inline them into the client bundle. Server-only
 * vars are read lazily and only ever imported from server code.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(
      `Missing required environment variable: ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export const publicEnv = {
  /** True when the browser-safe Supabase vars are present (no throw). */
  isSupabaseConfigured: () =>
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  supabaseUrl: () =>
    required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  // Browser-safe publishable key (Supabase's new key model; replaces "anon").
  supabasePublishableKey: () =>
    required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  siteUrl: () =>
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

/** Server-only. Do not import from Client Components. */
export const serverEnv = {
  supabaseServiceRoleKey: () =>
    required(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
  aiProvider: (): "openai" | "anthropic" =>
    process.env.AI_PROVIDER === "anthropic" ? "anthropic" : "openai",
  openaiApiKey: () => required("OPENAI_API_KEY", process.env.OPENAI_API_KEY),
  openaiModel: () => process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  anthropicApiKey: () =>
    required("ANTHROPIC_API_KEY", process.env.ANTHROPIC_API_KEY),
  anthropicModel: () => process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8",
};
