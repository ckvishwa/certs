/**
 * Release feature flags.
 *
 * The quiz/mistakes surfaces and the AI layer are fully built but FROZEN for the
 * Foundation release: the code stays in the repo, but every entry point is
 * disabled until its slice is unfrozen. Frozen UI routes redirect to /today and
 * the AI API route returns 404 — so nothing frozen is reachable by direct URL,
 * and no AI/provider or service-role credential is ever required in production.
 *
 * To unfreeze a surface later: flip its flag here AND re-enable its sidebar nav
 * item (`ready: true` in components/app/sidebar.tsx).
 */
export const FEATURES = {
  quiz: false,
  ai: false,
} as const;
