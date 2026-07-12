# ARCHITECTURE

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 App Router, React 19, TypeScript strict |
| UI | Tailwind CSS v4, local shadcn-style primitives (`components/ui`) |
| Data / Auth / Storage | Supabase (Postgres + Auth + Storage) |
| Validation | Zod |
| AI | Provider abstraction (`lib/ai`), OpenAI default |
| Tests | Vitest + RTL (unit/integration), Playwright (E2E) |
| Deploy | Vercel + Supabase |

## Directory layout

```
app/
  (auth)/            # sign-in, sign-up (public)
  (app)/             # authenticated shell: today, knowledge-map, learn, review,
                     #   practice, mistakes, library
  onboarding/        # first-run flow
  api/               # route handlers (AI, etc.)
components/
  ui/                # shadcn-style primitives
  <feature>/         # feature components
lib/
  supabase/          # server.ts, client.ts, middleware.ts
  ai/                # provider.ts, services/*.ts, schemas.ts
  learning/          # mastery.ts, fsrs.ts, scheduler.ts, readiness.ts (pure)
  db/                # typed query helpers
  validation/        # shared zod schemas
  types/             # database types
supabase/
  migrations/        # SQL — source of truth for schema
  seed/              # syllabus seed data
docs/
tests/
  unit/  e2e/
```

## Rendering & data flow

- **Reads:** Server Components query Supabase via the server client (respects the
  authenticated user's RLS context).
- **Writes:** Server Actions / Route Handlers. Zod-validate input, authorize
  server-side, then mutate.
- **Client state:** kept minimal; interactivity via Client Components that call
  Server Actions.
- The Supabase **service-role key is server-only** — it never ships to the client
  and is used only by seed/admin tasks.

## Learning engine

`lib/learning/*` are **pure functions** (no DB/UI imports) so mastery, spaced
repetition, scheduling, and readiness are unit-testable in isolation. DB-facing
code calls them and persists the results. See `LEARNING_ENGINE.md`.

## AI

Each AI capability is a discrete, Zod-validated service behind a provider
interface. No single mega-prompt. Untrusted document text is never placed in a
privileged instruction position. See `AI_SYSTEM.md`.

## Security boundaries

Authorization is always server-side and enforced at the database with RLS. See
`SECURITY.md`.
