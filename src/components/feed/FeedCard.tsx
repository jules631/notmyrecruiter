import Link from 'next/link'
import type { SubmissionWithDetails, VerificationTier } from '@/lib/types'

interface Props {
  submission: SubmissionWithDetails
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function daysSince(dateStr: string) {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  if (d === 0) return 'today'
  if (d === 1) return '1 day ago'
  return `${d} days ago`
}

interface VerificationBadgeProps {
  tier: VerificationTier | null
  evidenceReviewed: boolean
}

function VerificationBadge({ tier, evidenceReviewed }: VerificationBadgeProps) {
  if (!evidenceReviewed || !tier || tier === 'email_only') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full">
        Pending review
      </span>
    )
  }

  if (tier === 'interaction_confirmed') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Interaction verified
      </span>
    )
  }

  if (tier === 'header_verified') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        Follow-up verified
      </span>
    )
  }

  if (tier === 'community_verified') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
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
    <article className="card group">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
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
            {submission.role_applied && (
              <> &middot; <span className="italic">{submission.role_applied}</span></>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
          <VerificationBadge
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
      </div>

      {/* Summary */}
      <p className="text-sm text-[var(--text-primary)] leading-relaxed mb-4 line-clamp-3">
        {submission.summary}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>
          Interview: {formatDate(submission.interview_date)} &middot; reported {daysSince(submission.published_at!)}
        </span>
        <Link
          href={`/dispute/${submission.id}`}
          className="text-[var(--text-secondary)] hover:text-accent transition-colors opacity-0 group-hover:opacity-100"
        >
          Dispute
        </Link>
      </div>
    </article>
  )
}
