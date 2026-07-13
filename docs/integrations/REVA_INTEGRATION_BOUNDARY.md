# REVA Integration Boundary

Status: Accepted
Date: 2026-07-13

This document defines where Certs ends and REVA begins. It is intentionally narrow — the full REVA architecture lives in the sibling repository at `D:\Projects\AuraO\docs\architecture\` (start at `00_MASTER_INDEX.md`). This file does not duplicate that architecture; it states only the boundary as seen from Certs.

## Certs owns learning truth

Curriculum, mastery, weak concepts, due reviews, readiness, streak, and learning missions are canonical to this repository and its Supabase project. No other system — not REVA's Windows Personal Node, not a future Cloud Relay, not Android's local cache — is authoritative for any of this data. See AuraO's `docs/architecture/06_DATA_OWNERSHIP_MATRIX.md` for the full cross-system matrix; the one-line version is: **Certs owns learning truth, Windows owns finance/Gmail truth, Cloud owns transport state, Android owns nothing canonical.**

## REVA owner authentication maps a device to a Certs owner

The private owner-sync mechanism (`app/api/mobile/owner/{enroll,learning-state}/route.ts`, migration `supabase/migrations/0006_reva_owner_devices.sql`, documented in `docs/REVA_OWNER_SYNC.md`) issues a device-scoped bearer token that resolves, server-side, to exactly one Certs owner (`owner_user_id`). REVA/Android never supplies a learner or owner identifier directly — the server always resolves identity from the authenticated token. This is intentionally the same enrollment-token pattern AuraO's architecture generalizes into its own Cloud Relay design (see AuraO `docs/architecture/13_CLOUD_RELAY.md`) — Certs' implementation is the working reference precedent, not a shared component. Certs does not become the Cloud Relay for AuraO's finance/Gmail data as a result of this precedent.

## Certs exposes private learning-state APIs

- `GET /api/mobile/certifications` and `GET /api/mobile/certifications/:slug` — public, schema-versioned curriculum, safe to cache/bundle client-side. No learner state, attempts, PII, tokens, or secrets.
- `POST /api/mobile/owner/enroll` — exchanges a one-time enrollment code for a device token. Rate-limited (5 attempts/15 min per IP, in-memory/best-effort).
- `GET /api/mobile/owner/learning-state` — private, bearer-token-authenticated, `private, no-store`, schema-versioned (`schemaVersion: 1`) readiness/mastery/mission snapshot for the enrolled owner.

## REVA does not directly access Certs database tables

All access is through the typed APIs above. REVA never receives Supabase service-role credentials, never queries Certs' Postgres tables directly, and never bypasses these endpoints for any reason, including debugging.

## Finance and Gmail data do not belong in Certs

Certs has no financial or Gmail-derived data model, and none should be added here. That data belongs exclusively to the AuraO Windows Personal Node design (see AuraO `docs/architecture/02_CURRENT_IMPLEMENTATION_STATE.md` and `21_FINANCE_CANONICAL_LEDGER.md`).

## Certs is not the general cloud relay for all personal data

Unless a future ADR in the AuraO architecture set explicitly changes this boundary, Certs remains scoped to learning data only. The owner-sync device-token mechanism described above is a precedent and a proof of pattern, not a claim that Certs is becoming REVA's general-purpose Cloud Relay.

## Current owner-sync deployment status

Verified 2026-07-13 by direct repository, CI, and Vercel inspection (not accepted from an unverified report):

- Certs `main` HEAD: `677bfb3`. Owner-sync code is committed and pushed only on `release/reva-owner-sync-certs` @ `15d2f22` — **not merged to `main`**.
- Migration `0006_reva_owner_devices.sql`: committed and pushed on the release branch; **applying it to the production database is documented as a manual, not-yet-confirmed-complete step** in `docs/REVA_OWNER_SYNC.md` ("Apply only after reviewing the SQL"). Treat as not yet applied to production until independently confirmed.
- Certs Vercel deployment (project `certs`, `prj_bEAxSVPuUlcVKZzcGfPsmI8AuFWw`): a direct Vercel API call during this audit returned `403 Forbidden`, requiring re-authentication to the `ckvishwas-projects` scope. **Deployment access is currently blocked.**
- Real-device enrollment and revocation have not been independently verified in this pass.

## API versioning expectations

`learning-state` responses are schema-versioned (`schemaVersion: 1`). Any breaking change to the response shape requires a version bump; REVA's mobile client is expected to check this field and treat an unrecognized version as "update required," not attempt to parse it optimistically.

## Revocation behavior

Setting `revoked_at` on a `reva_owner_devices` row denies the next authenticated request from that device immediately. Revocation is server-side only; there is no client-initiated revocation of another device's token.

## Required no-store behavior

`learning-state` and `enroll` responses must remain `private, no-store` — this data is never eligible for caching by intermediate proxies or CDNs, since it resolves to a specific owner's private learning progress.

## See also

- `docs/REVA_OWNER_SYNC.md` (this repo) — implementation detail and threat model for the mechanism referenced above.
- `D:\Projects\AuraO\docs\architecture\00_MASTER_INDEX.md` — full REVA architecture, including where this boundary fits into the larger system.
- `D:\Projects\AuraO\docs\REVA_LEARN_ARCHITECTURE.md` — the mobile-side native Learn integration that consumes the public curriculum APIs referenced above.
