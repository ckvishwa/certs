# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Product

The application is an adaptive certification exam-prep platform (Cisco CCNA 200-301,
CompTIA Security+ SY0-701). It is **not** a course library: the core job is to
model per-concept mastery/retention/confusion and prescribe what to study next.
See `docs/PRODUCT.md` and the non-negotiable principles there before making
product decisions (completion ≠ mastery; official syllabus is source of truth;
uploaded documents are untrusted data; optimize for exam success not screen time).

Current status: Phase 1 MVP, Slice 1 (Foundation) is the active focus. Slice 2
code (quiz engine: `app/(app)/practice/`, `app/(app)/mistakes/`, `lib/db/quiz.ts`)
and the AI layer (`lib/ai/`, `app/api/ai/explain/`) exist and pass tests/build but
are **intentionally frozen** — not linked from nav, not to be expanded — until the
Foundation slice (auth → onboarding → Today → Knowledge Map, all against a real
Supabase project) is verified end-to-end. Slice roadmap in `docs/ROADMAP.md`.

## Commands

```bash
npm run dev              # dev server (http://localhost:3000)
npm run build            # production build
npm run typecheck        # tsc --noEmit (strict)
npm run lint             # eslint
npm run format           # prettier --write .
npm run test             # vitest run (unit/integration)
npm run test:watch       # vitest watch
npx vitest run tests/unit/mastery.test.ts   # run a single test file
npx vitest run -t "computeMastery"          # run tests matching a name
npm run test:e2e         # playwright (auto-starts dev server; needs real env)
npm run db:link          # supabase link (interactive, run once per machine)
npm run db:push          # apply supabase/migrations/*.sql to the linked project
npm run db:seed          # seed syllabus + learner state (needs service-role key)
npm run db:types         # regenerate lib/types/database.ts from the live schema
```

Database schema lives in `supabase/migrations/*.sql` (source of truth). Apply with
the Supabase CLI (`npm run db:push`) against the hosted project, then regenerate
types with `npm run db:types` — never hand-edit generated types.

The Foundation E2E test (`tests/e2e/foundation.spec.ts`) auto-skips when
`NEXT_PUBLIC_SUPABASE_URL` is absent, so `npm run test:e2e` is safe to run without
credentials (it just skips) but only proves the flow when a real project is linked
and seeded.

## Environment

Copy `.env.example` → `.env.local`. Requires a hosted Supabase project:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (browser-safe —
note: **not** `ANON_KEY`, this project uses Supabase's newer publishable-key
naming), and `SUPABASE_SERVICE_ROLE_KEY` (server-only, used only by
`scripts/seed.mts`, never imported by app code that ships to the client). An AI key
(`OPENAI_API_KEY`) is **not required** for the Foundation slice — the AI layer is
frozen. Env access is centralized in `lib/env.ts` — `publicEnv` (client-safe) and
`serverEnv` (server-only); always read env through this module rather than
`process.env` directly, so missing vars fail with a clear error instead of `undefined`
propagating silently.

**Gotcha:** `vercel env pull .env.local` overwrites the whole file with only
`VERCEL_OIDC_TOKEN` if the three `NEXT_PUBLIC_*` vars aren't set in that Vercel
environment's scope — it silently wipes a working `.env.local`. If `npm run dev`
suddenly throws "Missing required environment variable", check `.env.local`'s
contents (var *names* only, never print values) before assuming app code broke.

Production is deployed at `https://certs-eosin.vercel.app` (Vercel project
`ckvishwas-projects/certs`, GitHub `ckvishwa/certs`, auto-deploys on push to
`main`). Hosted Supabase project ref: `pgraoxeqsxplbishwkfg`.

## Next.js 16 gotchas (this is NOT the Next.js in your training data)

- Middleware is renamed to **`proxy`**: the root file is `proxy.ts` exporting a
  `proxy()` function (not `middleware.ts`). It calls `updateSession` for Supabase
  auth refresh + route gating.
- `cookies()`, `headers()`, and route `params`/`searchParams` are **async** (await
  them). Read `node_modules/next/dist/docs/` for API specifics before using a
  feature you're unsure about.

## Architecture

Full detail in `docs/ARCHITECTURE.md`. Big picture:

- **Rendering:** Server Components read data via the request-scoped Supabase server
  client (`lib/supabase/server.ts`, respects RLS). Mutations go through Server
  Actions / Route Handlers. The service-role client (`lib/supabase/admin.ts`)
  bypasses RLS and is **server-only** (seed/admin/AI-logging).

- **Supabase clients:** `client.ts` (browser), `server.ts` (RSC/actions),
  `admin.ts` (service role), `middleware.ts` (`updateSession` used by `proxy.ts`).
  All are typed by `lib/types/database.ts`, currently a **hand-authored** mirror of
  the migrations. This is temporary scaffolding, not a second source of truth: once
  a hosted Supabase project is linked and migrations applied, run `npm run db:types`
  to generate real types from the live schema and replace the hand-authored file.
  The SQL migrations are always authoritative over any TypeScript type.

- **Layered authorization — no single point of trust.** `proxy.ts` (via
  `lib/supabase/middleware.ts`) does session refresh + early redirect for UX, but
  it is **not** the security boundary. Every Server Component that returns
  user-specific data and every Server Action that mutates independently calls
  `supabase.auth.getUser()` before proceeding — **never `getSession()`** for
  authorization, since `getUser()` revalidates the JWT against Supabase Auth while
  `getSession()` trusts an unverified cookie. RLS policies are the final backstop
  even if an app-layer check is missed. See `docs/SECURITY.md`.

- **Open-redirect prevention:** any redirect target derived from user input
  (`?redirect=`, `?next=` on the auth confirm route) must go through
  `safeInternalPath()` in `lib/auth/safe-redirect.ts`, which only allows
  root-relative, same-origin paths — never pass a raw query param to
  `redirect()`/`NextResponse.redirect()`.

- **Route-level UX boundaries:** `app/error.tsx`, `app/not-found.tsx`,
  `app/(app)/error.tsx`, `app/(app)/loading.tsx`, and `app/onboarding/loading.tsx`
  provide friendly error/loading/empty states per route group — add a matching
  `error.tsx`/`loading.tsx` when a new route group does meaningful async work.

- **Learning engine (`lib/learning/`):** the product IP, written as **pure
  functions** with no DB/UI imports so it's unit-testable. `mastery.ts`
  (mastery score + `deriveState`), `fsrs.ts` (spaced repetition), `scheduler.ts`
  (daily mission generation), `readiness.ts` (readiness estimate + pass gate).
  All tunable constants are exported config objects that tests pin. Persistence
  layers call these and store results. See `docs/LEARNING_ENGINE.md`.

- **AI (`lib/ai/`):** vendor-neutral. Code depends only on the `AIProvider`
  interface (`provider.ts`); `providers/openai.ts` + `providers/anthropic.ts` are
  the implementations. Every AI capability is a discrete service in
  `services/*` that calls `generateStructured()` (`structured.ts`), which enforces
  the JSON contract, Zod-validates the output (raw model output never persists
  unvalidated), repairs once on failure, and logs to `ai_generations`.
  **Prompt-injection defense:** untrusted document text is fenced in a
  `<<<UNTRUSTED_DOCUMENT>>>` block and the system prompt forbids following any
  instructions inside it — never place untrusted content in a system/instruction
  position. See `docs/AI_SYSTEM.md`.

- **Syllabus model:** `certification → exam_version → domain → objective →
  sub_objective → concept`, plus `concept_dependencies` (the knowledge graph).
  Never flatten it. Every versioned row carries `exam_version_id` so v1.1/v2.0
  content never mixes. `learner_concept_state` is one row per (user, concept) and
  holds the full learner model + derived `state` enum. `sub_objectives` are
  populated only where the *official* source document has a genuinely distinct
  grouped area (see `supabase/seed/data.mts`'s `SeedObjective.subObjectives`) —
  never create one per nested bullet or per acronym. The Knowledge Map currently
  renders concepts flat under their objective regardless of `sub_objective_id`
  (deliberate — adding a nested UI tier was assessed as unnecessary the last time
  objective count grew; revisit only if that assessment changes).

- **Syllabus content must trace to an official source.** Objective codes,
  titles, domain weights come from the vendor's own exam objectives document,
  never AI memory, blogs, or third-party training material. Official PDFs live
  in `docs/sources/` (gitignored, not committed — see that directory for
  provenance notes on which file is canonical vs explicitly excluded for a given
  cert/version). Every seed content change should be checked against
  `tests/unit/syllabus-integrity.test.ts`, which validates structural invariants
  (domain weights sum to 100, exact expected objective codes, no duplicate
  slugs/codes, no dependency cycles, CCNA/Security+ isolation) directly against
  `supabase/seed/data.mts` — no database required to run it.

- **Seed data module is `.mts` and lives outside `app`/`lib`:** importing
  `supabase/seed/data.mts` from a test requires the explicit `.mts` extension
  (`@/supabase/seed/data.mts`), which needs `allowImportingTsExtensions: true` in
  `tsconfig.json` (already set) — extensionless imports of `.mts` files do not
  resolve under this project's `moduleResolution: bundler` setup the way `.ts`
  imports do.

- **Feature gating, two layers:** `lib/features.ts` (`FEATURES.quiz`,
  `FEATURES.ai`) is the actual server-side gate — frozen pages
  (`app/(app)/practice`, `app/(app)/mistakes`) `redirect("/today")` and the
  frozen API route (`app/api/ai/explain`) returns `404`, both as the *first*
  line of the handler, before touching auth/Supabase/any provider. This means a
  frozen surface is unreachable even by direct URL, not just hidden from nav.
  `components/app/sidebar.tsx`'s per-item `ready: boolean` is the separate
  nav-hiding layer. When unfreezing a slice, flip **both** — the `FEATURES` flag
  and the sidebar's `ready` flag — flipping only one leaves either a reachable-
  but-unlinked page or a linked-but-blocked one.

## Conventions

- TypeScript strict; avoid `any`. Import alias `@/*` maps to the repo root.
- UI primitives in `components/ui/` are local shadcn-style components (no shadcn
  CLI); style via the design tokens in `app/globals.css` (dark-default, with
  `learner_state` status colors). Color is never the sole status signal — pair
  with glyphs/labels for accessibility.
- Add a note to `docs/DECISIONS.md` when making a significant architecture choice.
