# REVA Learn Integration Audit

Audit date: 2026-07-13. Scope: full read-only audit of the Certs platform (D:\Projects\Certs) to prepare a mobile integration boundary for the REVA Flutter app. No code was changed in Certs to produce this document. All findings are cited with exact file paths and, where practical, file:line references.

Certs at audit time: branch `main`, last commit `39881a6 feat: add mastery heatmaps and centralized branding`, with a substantial **uncommitted working-tree change** already in progress (a new server-authoritative "practice sessions" feature — see §17 and §18). That in-progress work is not part of this integration and was not modified during this audit.

---

## 1. Product summary

Certs (working brand name, marked `isTemporary: true` in `lib/brand.ts`) is an adaptive certification exam-prep platform for Cisco CCNA 200-301 and CompTIA Security+ SY0-701. It is explicitly **not** a course-completion tracker — its stated job is to model per-concept mastery/retention/confusion for each learner and prescribe the next best study action. Stack: Next.js 16 (App Router), React 19, TypeScript strict, Supabase (Postgres + Auth, Row-Level Security). Per `CLAUDE.md`, the project is in "Phase 1 MVP, Slice 1 (Foundation)" — auth → onboarding → Today → Knowledge Map is the verified core; the quiz/practice engine is live but newer, and the AI explanation layer is deliberately frozen (404s before touching auth or a provider).

## 2. Architecture

- **Routing**: Next.js App Router with route groups `(auth)` and `(app)`. Page routes: `/` (redirect), `/sign-in`, `/sign-up`, `/onboarding`, `/today`, `/knowledge-map`, `/practice`, `/mistakes`. Sidebar nav (`components/app/sidebar.tsx`) also lists `/learn`, `/review`, `/mock`, `/analytics`, `/library` as `ready: false` placeholders — **no page files exist for these**, they render as disabled "soon" pills only.
- **API surface**: exactly one route today, `app/api/ai/explain/route.ts` (POST, frozen — returns 404 before any auth/DB/provider call while `FEATURES.ai === false`). `app/auth/confirm/route.ts` handles the Supabase email-confirmation callback.
- **Server actions**: `app/(auth)/actions.ts` (signIn/signUp/signOut), `app/onboarding/actions.ts` (completeOnboarding), `app/(app)/practice/actions.ts` (startSessionAction, submitPracticeAnswer — the quiz-grading entry point).
- **Auth boundary is layered, not single-point**: `proxy.ts` (Next 16's renamed middleware) does UX-only redirect gating via `lib/supabase/middleware.ts`'s `updateSession()`, which calls `supabase.auth.getUser()` (not `getSession()` — deliberately revalidates the token). Every Server Component/Server Action independently re-checks `supabase.auth.getUser()`. RLS is the final backstop. This layered model is documented explicitly in `CLAUDE.md` and is the pattern any new mobile-facing endpoint must also follow (see §15).
- **Supabase client variants**: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (RSC/Server Actions, cookie-bound), `lib/supabase/admin.ts` (service-role, RLS-bypassing — used only by the seed script, never by request-handling code).
- **Responsive/mobile-web**: server-rendered, dark-mode-only (`app/layout.tsx` hardcodes `className="dark"`), a PWA manifest exists (`app/manifest.ts`) but no service worker was found. `components/app/sidebar.tsx` implements a horizontal top bar under `md` breakpoint and a fixed left sidebar above it. No native mobile wrapper, Capacitor, or React Native config exists anywhere in the repo — this is the first mobile integration point of any kind.

## 3. Database schema

31 tables total across 5 migrations (`0001_schema.sql` → `0005_practice_sessions.sql`, the last of which is currently **uncommitted**). Core learning hierarchy (all FKs `ON DELETE CASCADE` unless noted):

```
certifications → exam_versions → domains → objectives → sub_objectives (optional) → concepts
                                                                              ↑ concept_dependencies (concept_id, prerequisite_id)
```

Per-user state tables: `learner_concept_state` (the mastery/FSRS table — accuracy, mastery_score, stability/difficulty/retrievability, state enum), `study_plans`, `mistakes`, `question_attempts`, and the new `practice_sessions` (uncommitted). Full column lists and every RLS policy are catalogued in the standalone audit-agent output retained in this task's working notes; the load-bearing points:

- **Content tables** (`certifications` through `concept_dependencies`, plus `mock_exams`) are world-readable to any authenticated user (`content_read` policy, `using (true)`).
- **Per-user tables** use a uniform `owner_all` policy (`auth.uid() = user_id`, full CRUD) — this is the exact ownership model a mobile API must replicate (never trust a client-supplied user id; always derive it from the authenticated session).
- 15 tables (`flashcards`, `flashcard_reviews`, `flashcard_states`, `confusion_pairs`, `mock_exams`, `mock_exam_attempts`, `notes`, `documents`, `document_chunks`, `imports`, `audit_logs`, `study_sessions`, `daily_missions`, `study_tasks`, plus `sub_objectives` for direct app-code queries) have RLS enabled but **zero application-code references** — schema exists, nothing built on top yet. Do not assume any of these are live features.
- **New/uncommitted**: `practice_sessions` (server-authoritative practice-session state, `question_ids uuid[]`, `status ACTIVE|COMPLETED|EXPIRED`) plus additive nullable `practice_session_id` FKs on `question_attempts` and `mistakes`, and a unique partial index that is the actual duplicate-submission guard (`uq_question_attempts_session_question`). This migration file exists on disk but its live-database application status is **unconfirmed** (see §16).

## 4. Security+ implementation

CompTIA Security+ SY0-701 is the only Security+ version seeded. Verified counts (see §4 of the dataset table in the companion counts document / §"Task 2" of the final report): **5 domains, 28 objectives, 38 sub-objectives, 98 concepts, 36 dependency edges** — all confirmed exact against `supabase/seed/data.mts` and cross-checked against passing tests in `tests/unit/syllabus-integrity.test.ts`. Domain weights (`12,22,18,28,20`) sum to 100 and match the official blueprint. No SY0-701 objective is a placeholder. Legacy SY0-301 and draft SY0-801 material exist only as source PDFs in `docs/sources/` (for reference) and are confirmed **not present anywhere in seed data or scripts** (verified by grep — zero matches). The canonical source PDF `docs/sources/CompTIA-Security-Plus-SY0-701-Exam-Objectives.pdf` exists (191,074 bytes).

## 5. CCNA implementation

Two exam versions seeded: `200-301 v1.1` (active) and `200-301 v2.0` (an intentional stub — every v2.0 objective is a generated placeholder, code `${domainCode}.x`, title literally `"PLACEHOLDER — ... pending official v2.0 blueprint"`). v1.1 has real objective titles across 6 domains, but **every objective is `placeholder: true`** and most concepts are "structure only." Combined totals across both versions: **23 objectives, 20 concepts** — confirmed exact by test (`syllabus-integrity.test.ts:226-227`, `toBe(23)`/`toBe(20)`). CCNA is materially less complete than Security+ and must not be presented to a mobile user as fully built — see the CCNA-card requirement in the architecture doc.

## 6. Learning engine

Pure-function core under `lib/learning/`, cleanly separated from persistence:
- `attempt.ts` — `applyAttempt()`, the live per-attempt mastery update (EMA-smoothed accuracy × difficulty × volume-ramp), called directly from `submitPracticeAnswer`.
- `mastery.ts` — `computeMastery()` (a richer multiplicative model) exists and is tested but currently has **no callers outside its own test** — it is not the live path; `deriveState()` from the same file *is* live (used inside `attempt.ts`).
- `scheduler.ts` — `generateDailyMission()`, a custom (non-FSRS) daily-mission planner: rescue task first, due-reviews capped at 40% of the day's budget, then mixed quiz, then new concepts.
- `fsrs.ts` — a self-described "faithful-enough, not bit-exact" spaced-repetition scheduler, governs individual concept/flashcard review intervals (separate from the daily-mission scheduler above).
- `readiness.ts` — `computeReadiness()`, an 8-component weighted formula (coverage, mastery, retention, mixed/timed/mock performance, domain balance, confidence calibration) producing a 0-100 score + HIGH/MODERATE/LOW band. A stricter `passGate()` (exam-readiness gate) exists but has **zero callers anywhere in the app**.
- `mistake-classify.ts` — `classifyMistake()`, a deliberately conservative 4-category classifier (of 12 possible `MistakeType` values) that returns `null` rather than guessing when signals are ambiguous.
- `question-selection.ts` (new, uncommitted) — `selectQuestions()`, a pure/deterministic 7-tier priority picker for practice sessions.
- `objective-mastery.ts` — `aggregateObjectiveMastery()` (concept→objective rollup) and `rankRecommendedObjectives()` (new, uncommitted, additive).

**Do not reimplement any of the above.** All of it is real, tested, deliberately-designed logic (see docstrings on multiplicative mastery collapse, conservative mistake null-classification, scheduler review-budget capping).

## 7. Mastery

Bottom-up aggregation: concept mastery (`attempt.ts` → `learner_concept_state.mastery_score`) → objective mastery (`aggregateObjectiveMastery`, weighted concept average + 5-state band: unseen/weak/developing/mastered/due_for_review) → domain mastery (plain average of constituent objective concepts, computed inline in `lib/db/knowledge-map.ts`, **no dedicated domain-mastery module**) → certification-level `overallMastery` (plain average of every concept in the version, also inline in `knowledge-map.ts`). There is no weighted-by-blueprint-percentage rollup at the domain/certification level today — it's a flat average.

## 8. Scheduling

`generateDailyMission()` in `lib/learning/scheduler.ts` is the live daily-mission generator, called from `/today`. It is not FSRS-driven at the mission-planning level (FSRS governs individual concept review timing, feeding into "due" status; the scheduler decides which due/weak/new concepts make it into today's plan and in what order, respecting a time budget). Output is an ordered list of typed tasks (`GeneratedTask[]`) with title/reason/estimatedMinutes/payload — this is the closest existing analog to REVA's `StudyMission` model and should be mapped to it, not reinvented.

## 9. Readiness

`computeReadiness()` in `lib/learning/readiness.ts` is complete and well-tested, but **as called from `/today` today, 5 of its 8 inputs are hardcoded to 0** (`mixedPerformance`, `timedPerformance`, `mockPerformance`, `domainBalance`, `confidenceCalibration` — see `app/(app)/today/page.tsx:104-113`). Only `coverage` and `mastery` are real; `retention` is a crude placeholder. **Any readiness score surfaced to a mobile client today reflects this same limitation** — it is a real number, produced by a real formula, but built on a mostly-stubbed input set. This should be stated plainly in the mobile UI's data-provenance handling, not hidden.

## 10. Mistakes

`classifyMistake()` (§6) assigns one of 4 categories (`KNOWLEDGE_GAP`, `CONCEPT_CONFUSION`, `KEYWORD_TRAP`, `PREREQUISITE_GAP`) or leaves a mistake unclassified. Two taxonomy surfaces exist and must stay in sync if extended: a 12-value DB enum (`MistakeType`) vs. a narrower 5-value heatmap-eligible subset (`lib/learning/mistake-heatmap.ts`'s `MISTAKE_TAXONOMY`, which adds `SCOPE_ERROR` but the classifier never actually emits it). `lib/db/mistakes.ts` (currently mid-edit but functionally complete — diff is purely additive) fetches and joins mistake context in batched queries (no N+1). Not wired into the mobile summary endpoint built for this task's first slice — out of scope for the minimal endpoint, in scope for a later native Learn slice.

## 11. Practice

**This is the least stable surface in the codebase right now.** The repo is mid-migration from a client-accumulates-then-grades quiz to a server-authoritative, one-question-at-a-time "practice session" (new `practice_sessions` table, `lib/db/practice-session.ts`, `lib/learning/question-selection.ts`, rewritten `app/(app)/practice/actions.ts` and `page.tsx`). The new server-side logic (`submitPracticeAnswer`) is genuinely careful — re-derives ownership/correctness entirely from persisted DB state, relies on a DB-level unique index (not just app logic) to guard against duplicate submissions, validates strictly with Zod before any DB call. **However, `components/practice/quiz-runner.tsx` currently does not compile** — confirmed via `npx tsc --noEmit` (`error TS2304: Cannot find name 'useEffect'`, the import was dropped mid-refactor) and `npm run lint` (same location, a related hooks-rules violation). This is uncommitted, in-progress work, not something this audit or the REVA Learn integration should touch or depend on.

## 12. Quiz engine

Old path (`lib/db/quiz.ts`'s `buildQuiz()`) is now **orphaned** — zero callers anywhere in the repo, superseded by the practice-session rewrite above. New grading path (`submitPracticeAnswer` in `app/(app)/practice/actions.ts`) does exact-set-match correctness checking, applies `attempt.ts`'s mastery update per linked concept, classifies mistakes on failure, and advances session state only after all writes succeed. Well-designed but unit-tested only on its input-validation path (`tests/unit/practice-actions-validation.test.ts` explicitly scopes itself to pre-DB Zod rejection); the grading/mastery-update/session-advance body has no executed test coverage in this audit (the e2e specs that would cover it were not run, per the audit's no-live-writes constraint).

## 13. Knowledge Map

`getKnowledgeMap()` in `lib/db/knowledge-map.ts` loads the full domain→objective→concept tree plus learner state and recent mistakes in 5 batched queries (explicitly designed to avoid per-node queries). Important: **the "Knowledge Map" is not a graph-traversal/visualization system.** `components/knowledge-map/knowledge-map-workspace.tsx`'s dependency view is a flat list of one-hop `[prerequisite] → [concept]` pairs grouped by objective — no node/edge canvas, no layout engine, no transitive closure, no cycle-aware traversal. If REVA Learn's `KnowledgeMapNode`/`KnowledgeMapEdge` models imply an actual graph UI, that would be new work on the REVA side, not a port of existing Certs UI — the data (concept_dependencies rows) is real and available, the visualization is not.

## 14. Heatmaps

Two components, both recent (matching the "add mastery heatmaps" commit): `ObjectiveMasteryHeatmap` (objective × mastery-state grid, grouped by domain, drill-down to weak concepts/prerequisite gaps/recent mistakes) and `MistakePatternHeatmap` (a true objective × mistake-taxonomy matrix with a 7/30/90-day range toggle). Both are presentational, driven entirely by `getKnowledgeMap()`'s output, no extra queries. Neither is exposed via any API route today — they run inside Server Components with direct DB access.

## 15. Authentication

Google/email-password via Supabase Auth (see §2/§3). For a mobile API, the correct pattern to follow is exactly what `app/api/ai/explain/route.ts` and every Server Action already do: build a request-scoped Supabase client, call `supabase.auth.getUser()` (never trust a client-asserted user id), and let RLS + explicit `.eq('user_id', user.id)` filters be the actual ownership boundary. Next.js API routes read the Supabase session from cookies by default; **a mobile client will not have cookies** — it needs Bearer-JWT support. Confirmed: no existing Certs API route accepts a Bearer token today (the only one, `/api/ai/explain`, is frozen and unauthenticated-path-tested only via cookie session in `foundation.spec.ts`). This is a genuine gap — the new mobile endpoint must add Bearer-token support explicitly (see the architecture doc's authentication decision).

## 16. API readiness

Effectively zero mobile-facing API surface exists before this task — one route (`/api/ai/explain`), frozen, cookie-session-only, POST-only, unrelated to Learn content. There is no existing `/api/mobile/*` namespace, no existing Bearer-token verification helper on the Certs side, and no CORS configuration was found (irrelevant for a native mobile HTTP client, but confirms no prior mobile-consumption intent). Building `GET /api/mobile/learn/summary` is genuinely new surface, not a port of an existing route.

## 17. Mobile readiness

Certs has no existing native-mobile integration point of any kind — no Capacitor, no React Native, no existing mobile API namespace, no deep-link scheme, no CORS setup for a separate mobile origin. The **hosted-vs-local migration state is a real open question**: migration `0005_practice_sessions.sql` exists on disk, is uncommitted, and its application status against the live Supabase project could not be confirmed from repo contents alone (see the companion hosted/local data table in the final report — Task 3). Do not assume schema parity between local files and the hosted database without running the verification commands listed there.

## 18. Current gaps

- `components/practice/quiz-runner.tsx` does not compile (missing `useEffect` import) — pre-existing, uncommitted, unrelated to this integration; flagged, not fixed.
- No CI pipeline exists (`.github/workflows/` is entirely absent from Certs) — nothing currently gates `main` before merge.
- Readiness score is built on 5/8 stubbed inputs at its only call site.
- 15 schema tables (flashcards, mock exams, notes/documents/ingestion, daily missions/tasks, confusion pairs, audit logs) exist with RLS enabled but zero application code — do not assume any of these are usable today.
- Prerequisite-gap threshold logic is duplicated (not shared) between `lib/db/practice-session.ts` and `app/(app)/practice/actions.ts`.
- No mobile-facing API namespace, no Bearer-token auth support on any existing route.

## 19. Risk areas

- Building on top of `practice/*` or `lib/db/practice-session.ts` right now inherits a broken UI component and thin test coverage on the most complex new logic — avoid touching this surface for the first REVA Learn slice.
- The uncommitted `0005_practice_sessions.sql` migration's live-database status is unverified; any new endpoint must not assume it has been applied.
- Readiness numbers surfaced to mobile users should be presented with the caveat that most inputs are currently stubbed, to avoid setting a false precision expectation.
- CCNA content is materially incomplete (placeholder objectives, "structure only" concepts) — must not be presented as feature-complete in any UI, mobile or web.

## 20. Recommended integration order

1. Ship the smallest possible authenticated, ownership-enforced mobile summary endpoint (`GET /api/mobile/learn/summary`) reusing existing `getActiveStudyPlan`/`getKnowledgeMap`/`computeReadiness`/`generateDailyMission`/`getCertificationsWithVersions` — no new learning-engine logic.
2. Native Learn landing + cert cards + Today card in REVA, backed by that endpoint with an explicit, clearly-labeled offline/dev fallback (matches REVA's existing offline-first precedent from Actions/Inbox, since full mobile auth is still in progress per `PRODUCTION_TASKS.md`).
3. Wrapped-WebView fallback for `/today`, `/knowledge-map` only (skip `/mistakes` and `/practice` until the quiz-runner compile bug is fixed and practice-session logic is test-covered end to end).
4. Only after the above is stable: native ports of Knowledge Map and mistake heatmap views, and reconsider exposing practice/mistakes once the Certs-side issues in §18/§19 are resolved.
