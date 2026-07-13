# Native REVA curriculum API

The mobile curriculum surface is public because it contains only curated syllabus metadata. It does not return learner state, PII, attempts, mistakes, tokens, or database UUIDs. Learner summary remains the separately authenticated `GET /api/mobile/learn/summary` endpoint.

## Endpoints

- `GET /api/mobile/certifications` returns `{ schemaVersion: 1, certifications: [...] }`, ordered by certification slug.
- `GET /api/mobile/certifications/:slug` returns the full ordered certification tree: versions, domains, objectives, sub-objectives, concepts, and one-hop dependencies.
- `GET /api/mobile/health` returns only schema and public curriculum-count health data for deployment verification.

Accepted slugs are `security-plus-sy0-701` and `ccna`. Unknown slugs return:

```json
{ "error": { "code": "NOT_FOUND", "message": "Certification not found" } }
```

Content IDs are deterministic content keys, not database identifiers. `schemaVersion` must be checked by clients before parsing. Ordering follows the official seed blueprint positions.

## Offline export

Run `npm run export:mobile-curriculum`. It writes `mobile_exports/security-plus-sy0-701.v1.json` and `mobile_exports/ccna.v1.json` from `supabase/seed/data.mts`. Defaults are deterministic (`generatedAt` is the Unix epoch and `sourceRevision` is `unversioned-source`); a release pipeline may explicitly set `MOBILE_EXPORT_SOURCE_REVISION`. Export integrity is covered by `tests/unit/mobile-curriculum.test.ts`.

## Production smoke check

Run `CERTS_BASE_URL=https://certs-eosin.vercel.app npm run verify:mobile-production`. The script validates response status, JSON content type, schema version, ordering, counts, and the absence of sensitive-looking fields without printing response bodies or secrets.
