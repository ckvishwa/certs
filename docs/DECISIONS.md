# DECISIONS (ADR)

Chronological record of significant architecture decisions.

## 0001 — Greenfield, Next.js App Router + Supabase

**Context:** Empty repo; spec calls for Next.js, Supabase, Zod, Vitest/Playwright,
AI abstraction. **Decision:** Next.js 16 App Router, React 19, TS strict; Supabase
for Postgres/Auth/Storage; hosted Supabase project. **Status:** accepted.

## 0002 — Hosted Supabase (not local Docker)

**Context:** Docker is available but a real deployable app is the goal.
**Decision:** use a hosted Supabase project; migrations pushed via Supabase CLI.
**Consequence:** requires project URL + keys in `.env.local`; app is
Vercel-deployable from day one.

## 0003 — OpenAI as default AI provider, behind an abstraction

**Context:** Spec wants vendor-neutral AI supporting Anthropic + OpenAI; user has
an OpenAI key. **Decision:** `lib/ai` provider interface with OpenAI default,
Anthropic swappable via `AI_PROVIDER`. Core logic never imports a vendor SDK.

## 0004 — Learning engine as pure modules

**Context:** Mastery/SRS/scheduling/readiness are the product's core IP and must be
correct. **Decision:** implement as pure functions in `lib/learning/` with no DB/UI
deps, unit-tested; persistence layers call them. **Consequence:** logic is testable
and tunable independently of the app.

## 0005 — Syllabus stored in DB, versioned; never flattened

**Context:** Official objectives are the source of truth; v1.1 and v2.0 must not
mix. **Decision:** full `certification → version → domain → objective →
sub_objective → concept` hierarchy in Postgres, every versioned row carrying
`exam_version_id`. Placeholder objective text is explicitly flagged
(`is_placeholder`) until official wording is sourced.

## 0006 — Local shadcn-style UI instead of the shadcn CLI

**Context:** shadcn CLI init is interactive and not yet fully aligned with Tailwind
v4 + Next 16. **Decision:** hand-author the same primitives (`components/ui`) using
our design tokens; keeps the build deterministic. Revisit if we need many more
components.

## 0007 — Build order: Foundation slice first

**Context:** MVP is 15 large features. **Decision:** build the schema/auth/syllabus
foundation before feature slices so later work builds on stable ground.
