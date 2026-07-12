# SETUP

Steps to run the application locally end-to-end. These steps require the hosted
Supabase project. AI remains frozen and no AI credential is required.

## 1. Create a Supabase project

1. Create a project at https://app.supabase.com.
2. Project Settings → API: copy the **Project URL**, **anon public** key, and
   **service_role** key.

## 2. Environment

```bash
cp .env.example .env.local
```

Fill in:

- `NEXT_PUBLIC_SUPABASE_URL` — Project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — publishable key (browser-safe)
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; used ONLY by the local seed script
- AI variables are optional and must remain unset while the AI feature is frozen.

## 3. Apply the schema

**Option A — Supabase CLI**

```bash
npm i -g supabase        # or use npx
supabase login
supabase link --project-ref <your-project-ref>
supabase db push         # applies supabase/migrations/*.sql
```

**Option B — SQL editor:** paste the contents of the three files in
`supabase/migrations/` (in order: 0001, 0002, 0003) into the Supabase SQL editor
and run them.

> For instant dev access, disable email confirmation in Supabase:
> Authentication → Providers → Email → turn off "Confirm email".
>
> If you keep confirmation ON, set the "Confirm signup" email template URL to
> `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/onboarding`
> so the link hits our token-hash callback route (`app/auth/confirm/route.ts`).

## 4. Seed the syllabus

```bash
npm run db:seed
```

Expected: `Seed complete: { certs: 2, versions: 3, domains: 17, objectives: ~20, concepts: ~30, deps: ~19, questions: 12 }`.

## 5. Run

```bash
npm run dev
```

Then: sign up → onboarding (pick CCNA v1.1) → **Today** → **Knowledge Map**.
The Knowledge Map exposes mastery and dependency views. AI actions are not
available while the feature is frozen.

## 6. Verify RLS (optional)

Create a second account and confirm it cannot read the first account's
`learner_concept_state` rows (query via the SQL editor as each user, or check that
each account only sees its own knowledge-map progress).
