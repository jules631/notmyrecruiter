import type { Metadata } from 'next'
import SubmissionForm from '@/components/forms/SubmissionForm'

export const metadata: Metadata = {
  title: 'Submit a Report — NotMyRecruiter',
  description: 'Report a recruiter who ghosted you or behaved unprofessionally after your interview.',
}

export default function SubmitPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-[var(--text-primary)] mb-2">
          Submit a Report
        </h1>
        <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
          Reports are reviewed and published after a 14-day waiting period.
          You must verify your email before submission. All reports are subject to
          our{' '}
          <a href="/about" className="text-accent hover:underline">
            community standards
          </a>
          .
        </p>
      </div>

      <div className="card">
        <SubmissionForm />
      </div>
    </div>
  )
}
