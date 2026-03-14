import Link from 'next/link'
import type { SubmissionWithDetails } from '@/lib/types'

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
        <div className="flex gap-1.5 shrink-0">
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
