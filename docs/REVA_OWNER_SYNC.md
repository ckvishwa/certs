# REVA private owner sync

## Architecture

REVA has no permanent owner credential. An owner generates a short-lived,
single-use enrollment code locally on the Certs server. REVA exchanges it once
for a random 256-bit device token over HTTPS. Android Keystore storage keeps the
raw token; Certs stores only its SHA-256 hash in `reva_owner_devices`.

`GET /api/mobile/owner/learning-state` accepts only that bearer token. The
server resolves the device's `owner_user_id`, then composes the response from
the existing active study plan, knowledge map, and readiness calculation. It
does not accept a learner or owner identifier from the phone. Responses are
`private, no-store` and schema-versioned (`schemaVersion: 1`).

## Migration and recovery

`0006_reva_owner_devices.sql` is additive: it creates `reva_enrollment_codes`,
`reva_owner_devices`, their indexes, RLS, and an atomic consume RPC. It drops
or renames no existing schema. To revoke a lost device, set its `revoked_at`
server-side; the next bearer request is denied immediately. Recovery is to
generate a new code and enroll a replacement device. A consumed code cannot be
reused.

Apply only after reviewing the SQL:

```powershell
npm run db:push
npm run db:types
```

The current database type mirror is a pre-existing hand-authored file with
unrelated WIP; regenerate it only from the linked production schema after the
migration is applied, never by manually copying table definitions.

## Generate an enrollment code

The command requires local server environment variables and accepts a profile
UUID only, which avoids ambiguous name matching:

```powershell
npm run reva:create-enrollment-code -- --owner <profile-uuid> --expires-in 10m
```

It prints only the enrollment code and expiry. Do not paste a generated code,
device token, service-role key, or request authorization header into logs or
issues.

## Threat model

| Threat | Mitigation | Remaining limitation |
| --- | --- | --- |
| APK extraction | No permanent owner secret is packaged; token is issued after enrollment. | A compromised enrolled device can use its own token until revoked. |
| Token theft | 256-bit token, Android secure storage, hash-only server storage, HTTPS. | Malware with device-level access may access app storage. |
| Code guessing | 144-bit random, short expiry, single use, and per-instance rate limiting. | In-memory rate limiting is best effort across serverless instances. |
| Lost phone | Server-side `revoked_at` invalidates token immediately. | Owner must perform revocation promptly. |
| Replay | Codes are transactionally consumed; tokens are bearer credentials. | A stolen valid bearer token remains replayable until revoked. |
| Logging leakage | Routes return generic errors and never log codes/tokens/headers. | Hosting/provider access logs should remain access-controlled. |
| Database leakage | Token/code hashes only; private tables have RLS and no client policies. | A service-role compromise can access private rows. |
| Revocation | Active-device lookup filters `revoked_at is null`. | Offline cached state remains visible locally until app data is cleared. |
