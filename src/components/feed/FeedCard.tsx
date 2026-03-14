import type { SubmissionWithDetails, VerificationTier, SubmissionCategory } from '@/lib/types'

interface Props {
  submission: SubmissionWithDetails
}

const CATEGORY_LABELS: Record<SubmissionCategory, string> = {
  ghosted_after_interview: '👻 Ghosted',
  bot_rejection: '🤖 Bot rejection',
  cancelled_disappeared: '🚪 Cancelled',
  cold_outreach_ghost: '📵 Cold ghost',
}

function formatMonthYear(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })
}

function daysSince(dateStr: string) {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  if (d === 0) return 'today'
  if (d === 1) return '1 day ago'
  return `${d} days ago`
}

interface VerificationDotProps {
  tier: VerificationTier | null
  evidenceReviewed: boolean
}

function VerificationDot({ tier, evidenceReviewed }: VerificationDotProps) {
  if (!evidenceReviewed || !tier || tier === 'email_only') {
    return (
      <span className="badge-pending">
        Pending review
      </span>
    )
  }

  if (tier === 'interaction_confirmed') {
    return (
      <span className="badge-verified">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Interaction verified
      </span>
    )
  }

  if (tier === 'header_verified') {
    return (
      <span className="badge-verified">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        Follow-up verified
      </span>
    )
  }

  if (tier === 'community_verified') {
    return (
      <span className="badge-community">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
        </svg>
        Community verified
      </span>
    )
  }

  return null
}

export default function FeedCard({ submission }: Props) {
  const recruiter = submission.recruiters
  const company = submission.companies

  return (
    <article className="card group relative">
      {/* Category badge — top right */}
      {submission.category && (
        <span className="badge-category absolute top-4 right-4">
          {CATEGORY_LABELS[submission.category]}
        </span>
      )}

      {/* Top row */}
      <div className="flex items-start gap-3 mb-3 pr-28">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-[var(--text-primary)]">
              {recruiter?.name ?? 'Unknown Recruiter'}
            </span>
            {recruiter?.title && (
              <span className="text-xs text-[var(--text-secondary)]">{recruiter.title}</span>
            )}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-0.5">
            {company?.name}
            {submission.interview_date && (
              <> &middot; {formatMonthYear(submission.interview_date)}</>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-[var(--text-primary)] leading-relaxed mb-4 line-clamp-3">
        {submission.summary}
      </p>

      {/* Footer: verified dot left, flag button right */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <VerificationDot
            tier={submission.verification_tier}
            evidenceReviewed={submission.evidence_reviewed}
          />
          {submission.flag_count >= 3 && (
            <span className="badge-flagged">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10l-1.5 2.5L16 8H6a1 1 0 00-1 1v7H3V6z" clipRule="evenodd" />
              </svg>
              {submission.flag_count}
            </span>
          )}
          {submission.has_rebuttal && (
            <span className="badge-rebuttal">rebuttal</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span className="hidden sm:inline">
            {submission.published_at ? `reported ${daysSince(submission.published_at)}` : ''}
          </span>
          <a
            href={`/dispute/${submission.id}`}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[var(--text-secondary)] hover:text-accent"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
            Flag
          </a>
        </div>
      </div>
    </article>
  )
}
