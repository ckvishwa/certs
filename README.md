# Certification Prep

> Temporary descriptive product name. The final brand is pending; runtime copy
> is centralized in [`lib/brand.ts`](lib/brand.ts).

**Learn. Recall. Apply. Test. Pass.**

An adaptive certification exam-prep platform — not a course library. The app
continuously models what you know, what you've forgotten, and what you confuse,
then tells you exactly what to study next. Initial certifications: **Cisco CCNA
(200-301 v1.1)** and **CompTIA Security+ (SY0-701)**.

> Status: **Phase 1 MVP** — Security+ syllabus, learner model, objective mastery,
> and classified-mistake visualizations are implemented. Quiz and AI routes
> remain frozen. See
> [`docs/ROADMAP.md`](docs/ROADMAP.md) and [`docs/SETUP.md`](docs/SETUP.md).

## Stack

- Next.js 16 (App Router) + React 19, TypeScript strict
- Tailwind CSS v4 + local shadcn-style UI primitives
- Supabase (Postgres + Auth + Storage) with Row-Level Security
- Zod validation at every boundary
- Dormant AI provider abstraction (feature remains frozen)
- Vitest + React Testing Library (unit), Playwright (E2E)

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase values
npm run dev
```

Then apply the database schema to your Supabase project (see
[`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) and `supabase/migrations/`) and seed the
syllabus (`npm run db:seed`).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit/integration tests |
| `npm run test:e2e` | Playwright E2E |
| `npm run db:seed` | Seed syllabus + learner state |

## Docs

- [`docs/PRODUCT.md`](docs/PRODUCT.md) — what we're building and why
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system design
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — database schema
- [`docs/LEARNING_ENGINE.md`](docs/LEARNING_ENGINE.md) — mastery, SRS, scheduler, readiness
- [`docs/AI_SYSTEM.md`](docs/AI_SYSTEM.md) — AI services + prompt-injection defense
- [`docs/SECURITY.md`](docs/SECURITY.md) — security model
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — phased plan
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — architecture decision record
