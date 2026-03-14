import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import DisputeForm from '@/components/forms/DisputeForm'
import type { SubmissionWithDetails } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Dispute a Report — NotMyRecruiter',
  description: 'If you are the recruiter named in this report, you may dispute it here.',
}

interface Props {
  params: { submissionId: string }
}

export default async function DisputePage({ params }: Props) {
  const supabase = createServerSupabaseClient()

  const { data: submission, error } = await supabase
    .from('submissions')
    .select(`
      *,
      recruiters (*, companies (*)),
      companies (*)
    `)
    .eq('id', params.submissionId)
    .eq('status', 'published')
    .single()

  if (error || !submission) {
    notFound()
  }

  const typedSubmission = submission as unknown as SubmissionWithDetails

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-[var(--text-primary)] mb-2">
          Dispute This Report
        </h1>
        <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
          If you are the recruiter or a representative of the company named in this
          report, you may file a dispute. We offer two tiers of verification.
        </p>
      </div>

      {/* Report summary */}
      <div className="card mb-6 bg-gray-50">
        <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wide font-medium mb-2">
          Report in question
        </div>
        <div className="font-medium text-sm text-[var(--text-primary)]">
          {typedSubmission.recruiters?.name} · {typedSubmission.companies?.name}
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {typedSubmission.summary}
        </p>
      </div>

      {/* Tier explanation */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="card border-blue-200 bg-blue-50/40">
          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
            Tier 1
          </div>
          <div className="text-sm font-medium text-[var(--text-primary)] mb-1">
            Email Verification
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Verify your identity using a company email address. Fastest path.
          </p>
        </div>
        <div className="card border-purple-200 bg-purple-50/40">
          <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">
            Tier 2
          </div>
          <div className="text-sm font-medium text-[var(--text-primary)] mb-1">
            LinkedIn Match
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Provide your LinkedIn URL to verify it matches the recruiter profile.
          </p>
        </div>
      </div>

      <div className="card">
        <DisputeForm submission={typedSubmission} />
      </div>
    </div>
  )
}
