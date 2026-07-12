# LEARNING ENGINE

Pure, unit-tested modules in `lib/learning/`. No DB or UI imports — they take
plain inputs and return plain outputs, so the logic is verifiable in isolation.

## `mastery.ts`

`mastery_score ∈ [0,1]` from a configurable weighted model (weights live in one
`MASTERY_WEIGHTS` config object, per §6):

```
mastery = recent_accuracy
        × difficulty_factor      // harder questions answered right count more
        × retention_factor       // decays as time since last recall grows
        × diversity_factor       // rewards varied question types/skills
        × spacing_factor         // rewards spaced, not crammed, success
        × application_factor     // rewards APPLY/ANALYZE/TROUBLESHOOT success
```

`deriveState()` maps counts + mastery + retention + streaks to a `learner_state`
(UNSEEN → … → MASTERED / DECAYING / NEEDS_RESCUE). Mastery is **never** just
percent-correct; a single correct answer never yields MASTERED.

## `fsrs.ts`

FSRS-style spaced repetition. Tracks `stability`, `difficulty`, `retrievability`;
schedules the next review from review history and **actual answer behavior**, not
only the user's self-rating. Repeatedly-forgotten items return sooner; confidently
recalled items stretch out. Daily review volume is capped and prioritized
(exam-critical → weak → decaying → high-weight domain).

## `scheduler.ts`

Generates the daily mission to fit available minutes: picks weak-topic rescue,
due reviews, and mixed practice by expected value. On missed days it **rebalances**
rather than stacking every overdue task into one impossible day (§10).

## `readiness.ts`

Produces a 0–100 internal readiness estimate (a **range**, clearly labelled an
estimate) from coverage, mastery, retention, mixed/timed/mock performance, domain
balance, and confidence calibration. Always names the limiting factor
("weakest domain: IP Connectivity") so the score is actionable. A separate pass
gate only recommends booking the exam when evidence is strong.

## Configuration

All tunable weights/thresholds live in exported config objects so the model can
evolve without rewrites, and so tests pin behavior to specific parameters.
