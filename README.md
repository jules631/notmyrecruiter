# NotMyRecruiter

An accountability platform for documenting recruiter ghosting and unprofessional conduct after interviews. Candidates submit evidence-backed reports. Recruiters can dispute reports they're named in. Community members can flag inaccurate submissions. Verified reports appear in a public, searchable feed.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript 5 |
| Styling | Tailwind CSS 3 |
| Database | Supabase (PostgreSQL with Row-Level Security) |
| Auth | Supabase Auth |
| Storage | Supabase Storage (evidence files) |
| Edge Functions | Deno (3 functions) |
| ORM/Client | `@supabase/supabase-js`, `@supabase/ssr` |

---

## Local Setup

### Prerequisites

- Node.js 18+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- A Supabase project (free tier works)

### Steps

```bash
# 1. Clone the repo
git clone <repo-url>
cd notmyrecruiter

# 2. Install dependencies
npm install

# 3. Copy environment file and fill in values
cp .env.local.example .env.local

# 4. Run migrations (see below)

# 5. Deploy edge functions (see below)

# 6. Start the dev server
npm run dev
```

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and set:

| Variable | Where to find it | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API | Exposed to browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API | Exposed to browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API | **Secret — never expose client-side** |

The `SUPABASE_SERVICE_ROLE_KEY` is used by the admin API routes and is automatically injected into Edge Functions by Supabase.

---

## Supabase Migrations

Run migrations **in order** using the Supabase CLI. They are numbered and must be applied sequentially — each migration depends on the schema from the previous one.

```bash
# Link to your remote project (one-time setup)
supabase link --project-ref <your-project-ref>

# Push all migrations to remote
supabase db push
```

Or apply them manually via the Supabase SQL Editor in this order:

### Migration 1 — `001_initial_schema.sql`

Creates all core tables, enums, indexes, and triggers:

- **Enums**: `submission_status`, `dispute_tier`, `dispute_status`
- **Tables**: `companies`, `recruiters`, `submitters`, `submissions`, `flags`, `disputes`
- **Triggers**:
  - `set_updated_at` — keeps `updated_at` current on all tables
  - `update_recruiter_report_count` — auto-increments/decrements `recruiters.report_count` on submission insert/delete
  - `update_company_report_count` — same for `companies.report_count`
  - `sync_has_rebuttal` — sets `submissions.has_rebuttal = true` when a dispute's `rebuttal_visible` flips to true

### Migration 2 — `002_rls_policies.sql`

Enables Row-Level Security on all tables and applies access policies:

| Table | Read | Write |
|---|---|---|
| `companies` | Public | Service role only |
| `recruiters` | Public | Service role only |
| `submitters` | Own row or service role | Own row or service role |
| `submissions` | Published = public; own pending; service role = all | Authenticated (own); service role for updates/deletes |
| `flags` | Own flags or service role | Authenticated insert |
| `disputes` | Service role only | Anyone can insert |

### Migration 3 — `003_evidence_fields.sql`

Adds evidence and verification tier support to `submissions`:

- **New enums**: `evidence_type`, `verification_tier`
- **New columns on `submissions`**:
  - `evidence_type` — type of evidence submitted
  - `evidence_reviewed` — boolean set by admin after review
  - `evidence_deleted_at` — timestamp when evidence file was purged
  - `verification_tier` — assigned tier after evidence review
  - `evidence_storage_path` — internal Supabase Storage path (never exposed publicly)
- **New indexes**: evidence review queue index; stale evidence cleanup index

---

## Edge Functions

Three Deno Edge Functions live in `supabase/functions/`. Deploy all of them:

```bash
# Deploy all functions
supabase functions deploy verify-submission
supabase functions deploy verify-standing
supabase functions deploy flag-threshold
```

Supabase automatically injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into the function runtime — no additional secrets configuration needed.

### `verify-submission`

**Trigger**: Called when attempting to publish a pending submission. Also accepts `{ purge_stale: true }` for a daily scheduled purge job.

**Request body**:
```json
{ "submission_id": "<uuid>" }
// or for purge job:
{ "purge_stale": true }
```

**Gates checked before publishing** (all must pass):

1. **Email verified** — `submitters.email_verified` must be `true`
2. **Evidence reviewed** — `submissions.evidence_reviewed` must be `true`
3. **14-day gate** — at least 14 days must have passed since `interview_date`
4. **Rate limit** — submitter may only have 1 active/published report per company per 90-day window

**On success**: Sets `status = 'published'`, `published_at`, and assigns a `verification_tier` (see Verification Tier System below).

**Purge mode**: Finds all `pending` submissions with unreviewed evidence older than 7 days, deletes evidence from Storage, and marks them `removed`.

---

### `verify-standing`

**Trigger**: Called immediately after a dispute is inserted.

**Request body**:
```json
{ "dispute_id": "<uuid>" }
```

**Verification logic**:

| Check | Method | Result |
|---|---|---|
| Tier 1 | Extract domain from `disputer_email`, compare (case-insensitive) to `companies.domain` | `standing_verified = true`, `tier = 'tier_1'` |
| Tier 2 | Normalize both LinkedIn URLs (strip protocol, `www.`, trailing slash), compare | `standing_verified = true`, `tier = 'tier_2'` |

Both checks are independent. Tier 2 takes precedence if both pass. All check results are logged to `disputes.admin_notes` for admin review.

---

### `flag-threshold`

**Trigger**: Called when a user flags a submission.

**Request body**:
```json
{
  "submission_id": "<uuid>",
  "flagger_id": "<uuid>",   // optional
  "reason": "string"         // optional
}
```

**Logic**:

1. Inserts a row into `flags` (unique constraint on `(submission_id, flagger_id)` prevents duplicate flags)
2. Increments `submissions.flag_count`
3. If `flag_count >= 5` AND `status = 'published'` → automatically sets `status = 'under_review'`

Returns `{ flag_count, status, auto_reviewed }`.

---

## Dispute Tier Logic

Recruiters who are named in a report can file a dispute. The system verifies their identity automatically using one or both of two tiers:

### Tier 1 — Email Domain Match (`tier_1`)

The domain portion of the recruiter's submitted email is compared (case-insensitive) to the company's `domain` field in the database.

```
user@acmecorp.com  →  "acmecorp.com"  ==  companies.domain  →  standing_verified
```

### Tier 2 — LinkedIn URL Match (`tier_2`)

Both LinkedIn URLs are normalized to their profile slug (protocol, `www.`, and trailing slash stripped) and compared.

```
https://www.linkedin.com/in/janedoe/  →  "janedoe"
https://linkedin.com/in/janedoe      →  "janedoe"
→  match  →  standing_verified
```

`standing_verified` becomes `true` if either tier passes. Tier 2 takes precedence for the recorded `tier` value if both succeed.

**After admin review**: An admin may set `status = 'accepted'` or `'rejected'`. When a dispute is accepted and `standing_verified = true`, `rebuttal_visible` is set to `true` and the recruiter's rebuttal text (max 500 characters) appears publicly on the submission.

---

## Verification Tier System

Every published submission carries a `verification_tier` indicating the strength of evidence that was reviewed. Tiers are assigned by the `verify-submission` Edge Function after an admin approves evidence.

| Tier | Value | Meaning |
|---|---|---|
| Pending | `email_only` | Email verified, evidence not yet reviewed by admin |
| Interaction Confirmed | `interaction_confirmed` | Admin reviewed: calendar invite, ATS confirmation, LinkedIn message, or recruiter email |
| Follow-up Verified | `header_verified` | Admin reviewed: follow-up screenshot (strongest single-submission evidence) |
| Community Verified | `community_verified` | Published 90+ days, no successful dispute, below flag threshold |

### Evidence Type → Tier Mapping

| Evidence Type | Resulting Tier |
|---|---|
| `calendar_invite` | `interaction_confirmed` |
| `ats_confirmation` | `interaction_confirmed` |
| `linkedin_message` | `interaction_confirmed` |
| `recruiter_email` | `interaction_confirmed` |
| `followup_screenshot` | `header_verified` |

### Tier Display in Feed

The `VerificationDot` component in `FeedCard.tsx` renders a visual badge:

- **Pending review** — `email_only` or evidence not yet reviewed
- **Interaction verified** — `interaction_confirmed`
- **Follow-up verified** — `header_verified`
- **Community verified** — `community_verified`
