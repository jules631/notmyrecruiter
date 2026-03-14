// ============================================================
// NotMyRecruiter — Shared TypeScript Types
// ============================================================

export type SubmissionStatus = 'pending' | 'published' | 'under_review' | 'removed'
export type DisputeTier = 'tier_1' | 'tier_2'
export type DisputeStatus = 'pending' | 'accepted' | 'rejected'

export type SubmissionCategory =
  | 'ghosted_after_interview'
  | 'bot_rejection'
  | 'cancelled_disappeared'
  | 'cold_outreach_ghost'

export type EvidenceType =
  | 'calendar_invite'
  | 'ats_confirmation'
  | 'linkedin_message'
  | 'recruiter_email'
  | 'followup_screenshot'

export type VerificationTier =
  | 'email_only'            // email verified, evidence pending admin review
  | 'interaction_confirmed' // evidence reviewed: calendar_invite | ats_confirmation | linkedin_message | recruiter_email
  | 'header_verified'       // evidence reviewed: followup_screenshot
  | 'community_verified'    // published 90+ days, no successful dispute, below flag threshold

export interface Company {
  id: string
  name: string
  domain: string
  logo_url: string | null
  report_count: number
  created_at: string
  updated_at: string
}

export interface Recruiter {
  id: string
  company_id: string
  name: string
  title: string | null
  linkedin_url: string | null
  email: string | null
  report_count: number
  standing_verified: boolean
  created_at: string
  updated_at: string
  // joined
  companies?: Company
}

export interface Submitter {
  id: string
  auth_user_id: string | null
  email: string
  email_verified: boolean
  submission_count: number
  created_at: string
  updated_at: string
}

export interface Submission {
  id: string
  submitter_id: string
  recruiter_id: string
  company_id: string
  category: SubmissionCategory | null
  summary: string
  interview_date: string
  last_contact_date: string | null
  status: SubmissionStatus
  flag_count: number
  has_rebuttal: boolean
  published_at: string | null
  evidence_type: EvidenceType | null
  evidence_reviewed: boolean
  evidence_deleted_at: string | null
  verification_tier: VerificationTier | null
  created_at: string
  updated_at: string
  // joined
  recruiters?: Recruiter
  companies?: Company
  submitters?: Submitter
}

export interface Flag {
  id: string
  submission_id: string
  flagger_id: string | null
  reason: string | null
  created_at: string
}

export interface Dispute {
  id: string
  submission_id: string
  disputer_email: string
  disputer_name: string | null
  linkedin_url: string | null
  company_domain: string | null
  tier: DisputeTier
  status: DisputeStatus
  standing_verified: boolean
  rebuttal_text: string | null
  rebuttal_visible: boolean
  admin_notes: string | null
  created_at: string
  updated_at: string
  // joined
  submissions?: Submission
}

// ── Feed / UI helpers ────────────────────────────────────────

export type FilterChip =
  | 'all'
  | 'ghosted_after_interview'
  | 'bot_rejection'
  | 'cancelled_disappeared'
  | 'cold_outreach_ghost'

export interface SubmissionWithDetails extends Submission {
  recruiters: Recruiter & { companies: Company }
  companies: Company
}
