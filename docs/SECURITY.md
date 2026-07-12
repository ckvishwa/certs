# SECURITY

Treat the application as production software.

## Authentication & authorization

- Supabase Auth for identity. Session read server-side via `@supabase/ssr`.
- **Authorization is always server-side** and enforced at the database with
  Row-Level Security. Never trust the client.
- User-scoped tables: policies restrict all access to `auth.uid() = user_id`
  (prevents IDOR / cross-user exposure).
- Content tables: read for authenticated users; writes restricted to admin /
  service role.
- The **service-role key is server-only** (seed/admin scripts, never bundled to
  the client).

## Input & file handling

- Zod validation at every boundary (forms, route handlers, AI I/O).
- Uploads: validate MIME type and size; store originals in Supabase Storage with
  signed access; sanitize file names.
- SQL injection avoided via the Supabase client / parameterized queries; XSS
  avoided via React escaping + no untrusted `dangerouslySetInnerHTML`.

## AI-specific

- **Prompt-injection defense:** uploaded documents are data, never instructions.
  See `AI_SYSTEM.md`.
- AI usage controls / rate limiting on generation endpoints.

## Operational

- Secrets via environment variables (`.env.local`, gitignored); `.env.example`
  documents required keys.
- Audit logging (`audit_logs`) for sensitive actions.
- Secure headers, CSRF-safe mutation patterns (Server Actions / same-site).

## IP / content policy

Users may privately analyze their own legitimate study materials. The platform
does **not** host or distribute stolen exam dumps or reconstruct proprietary live
exam questions. Uploaded material is transformed into private learning signals and
original practice.
