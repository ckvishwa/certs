# DATA MODEL

Postgres (Supabase). All tables use UUID PKs and `created_at` / `updated_at`
timestamps. Migrations in `supabase/migrations/` are the source of truth.

## Enums

- `content_source`: CURATED · AI_GENERATED · USER_UPLOADED · DERIVED_FROM_DOCUMENT
- `verification_status`: DRAFT · AI_REVIEWED · HUMAN_REVIEWED · VERIFIED
- `learner_state`: UNSEEN · EXPOSED · FRAGILE · LEARNING · RECALLING · APPLYING ·
  MASTERED · DECAYING · NEEDS_RESCUE
- `cognitive_skill`: REMEMBER · UNDERSTAND · APPLY · ANALYZE · TROUBLESHOOT
- `question_kind`: SINGLE · MULTI · ORDERING · MATCHING · FILL_BLANK · COMMAND ·
  SCENARIO · IMAGE
- `mistake_type`: KNOWLEDGE_GAP · MEMORY_FAILURE · CONFUSION · READING_ERROR ·
  COMMAND_SYNTAX · CALCULATION · OVERTHINKING · TIME_PRESSURE

## Syllabus (content — read-all-authenticated, admin-write)

- `certifications` — CCNA, Security+.
- `exam_versions` — belongs to certification (200-301 v1.1, v2.0, SY0-701).
  `active_from` / `testing_until` support transition mode.
- `domains` — belong to an exam_version; `weight` (blueprint %), `position`.
- `objectives` — belong to a domain; `code`, `title`, `is_placeholder`.
- `sub_objectives` — belong to an objective.
- `concepts` — atomic learnable units; linked to a sub_objective (and thus a
  version). Carry `source`, `verification_status`.
- `concept_dependencies` — concept N:N concept (`concept_id` requires
  `prerequisite_id`) — the knowledge graph.

Every versioned content row carries `exam_version_id` so v1.1 and v2.0 never mix.

## Learner (per-user — owner-only RLS)

- `profiles` — 1:1 with `auth.users`; display name, role, prefs.
- `study_plans` — chosen certification + exam_version, target date, weekday/weekend
  minutes, intensity, knowledge level.
- `study_sessions` — a bounded study block with an objective + reflection.
- `learner_concept_state` — **one row per (user, concept)**; the learner model.
  Counts (exposure/attempt/correct/incorrect), accuracy + recent accuracy,
  first-attempt accuracy, confidence, avg response time, `mastery_score`, FSRS
  `stability`/`difficulty`/`retrievability`, `last_studied`, `last_recalled`,
  `next_review`, consecutive-correct/incorrect streaks, derived `state`.
- `daily_missions` / `study_tasks` — generated plan for a given day.

## Assessment (schema now; wired in later slices)

`questions`, `question_choices`, `question_attempts`, `flashcards`,
`flashcard_reviews`, `mistakes`, `confusion_pairs`, `mock_exams`,
`mock_exam_attempts`. A question maps to one-or-more concepts (join), difficulty,
`cognitive_skill`, `question_kind`, `source`, `verification_status`.

## Ingestion / AI / audit

`notes`, `documents`, `document_chunks`, `imports`, `ai_generations`,
`audit_logs`. `ai_generations` records service name, prompt version, model, token
usage, and validation status for every AI call.

## RLS summary

- Content tables: `SELECT` for any authenticated user; writes restricted to admins
  / service role.
- User tables: full CRUD limited to `auth.uid() = user_id`.
