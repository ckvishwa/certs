# ROADMAP

## Phase 1 — MVP (in progress)

Delivered in vertical slices; each slice ends tested + documented.

- **Slice 1 — Foundation** *(done, runtime verify pending creds)*: project
  scaffold, Supabase auth, full DB schema + RLS, cert/version + syllabus model with
  seed data, learner state, dashboard + knowledge-map shell, pure learning-engine
  modules with tests, AI provider abstraction + `explainConcept`.
- **Slice 2 — Quiz engine** *(done, runtime verify pending creds)*: curated
  question seed, client-safe quiz loader, interactive quiz runner with per-answer
  feedback (why correct, why distractors wrong, objective, difficulty, exam trap),
  server-side grading, `submitAttempt` updates the learner model per concept
  (`applyAttempt`), and a classified error log (`classifyMistake`) at `/mistakes`.
- **Slice 3** — Flashcards (multiple card types) + FSRS spaced repetition + review
  flow.
- **Slice 4** — Daily mission generator wired live + basic readiness score on Today.
- **Slice 5** — Document / question-paper upload → extract → classify → import
  review → import, with prompt-injection defenses.
- **Slice 6** — Analytics polish, responsive passes, seed-data expansion, E2E flows.

## Phase 2

Adaptive diagnostic · confidence system + misconception queue · teach-back ·
blurt mode · advanced analytics · mock exams · exam readiness model · subnetting
dojo · Security+ PBQs.

## Phase 3

Cisco CLI simulation · boss fights · advanced knowledge graph · full adaptive
testing · multi-certification SaaS · instructor/admin workflows · organizations ·
subscriptions.

## Future certifications

Network+, CySA+, AWS, Azure, CISSP — enabled by the versioned syllabus model.

## Explicitly out of MVP scope

Full IOS emulator · multiplayer · social feed · native mobile apps · marketplace ·
complex achievements · voice tutor · full graph visualization · real-time collab ·
billing.
