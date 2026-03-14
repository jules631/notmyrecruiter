-- ============================================================
-- NotMyRecruiter — Evidence Fields + Verification Tier
-- Migration 003
-- ============================================================

-- ── New enums ────────────────────────────────────────────────

CREATE TYPE evidence_type AS ENUM (
  'calendar_invite',
  'ats_confirmation',
  'linkedin_message',
  'recruiter_email',
  'followup_screenshot'
);

CREATE TYPE verification_tier AS ENUM (
  'email_only',            -- email verified, evidence not yet reviewed (temporary pending state)
  'interaction_confirmed', -- evidence_reviewed = true, evidence_type in (calendar_invite, ats_confirmation, linkedin_message, recruiter_email)
  'header_verified',       -- evidence_reviewed = true, evidence_type = followup_screenshot
  'community_verified'     -- published 90+ days, no successful dispute, below flag threshold
);

-- ── Add columns to submissions ───────────────────────────────

ALTER TABLE submissions
  ADD COLUMN evidence_type      evidence_type,
  ADD COLUMN evidence_reviewed  BOOLEAN       NOT NULL DEFAULT FALSE,
  ADD COLUMN evidence_deleted_at TIMESTAMPTZ,
  ADD COLUMN verification_tier  verification_tier,
  ADD COLUMN evidence_storage_path TEXT;  -- internal path in Supabase Storage, never exposed publicly

-- ── Index for admin evidence review queue ────────────────────

CREATE INDEX idx_submissions_evidence_pending
  ON submissions (evidence_reviewed, evidence_deleted_at)
  WHERE evidence_reviewed = FALSE AND evidence_deleted_at IS NULL AND status = 'pending';

-- ── Auto-remove submissions with unreviewed evidence after 7 days ──
-- Handled by the verify-submission edge function on a scheduled basis.
-- This index supports that query.

CREATE INDEX idx_submissions_stale_evidence
  ON submissions (created_at)
  WHERE evidence_reviewed = FALSE AND status = 'pending';
