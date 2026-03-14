'use client'

import { useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase'
import type { SubmissionWithDetails } from '@/lib/types'

interface Props {
  submission: SubmissionWithDetails
}

type DisputeTierChoice = 'tier_1' | 'tier_2'

export default function DisputeForm({ submission }: Props) {
  const [tier, setTier] = useState<DisputeTierChoice>('tier_1')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [rebuttalText, setRebuttalText] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setErrorMsg('')

    try {
      const supabase = createClient()

      // Extract company domain from email for tier 1
      const companyDomain = tier === 'tier_1'
        ? email.split('@')[1]?.toLowerCase().trim() ?? null
        : null

      const { data: dispute, error: disputeError } = await supabase
        .from('disputes')
        .insert({
          submission_id: submission.id,
          disputer_email: email.toLowerCase().trim(),
          disputer_name: name.trim() || null,
          linkedin_url: linkedinUrl.trim() || null,
          company_domain: companyDomain,
          tier,
          rebuttal_text: rebuttalText.trim() || null,
          status: 'pending',
        })
        .select('id')
        .single()

      if (disputeError || !dispute) throw new Error(disputeError?.message ?? 'Failed to submit dispute')

      // Trigger verify-standing edge function
      const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/verify-standing`
      await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ dispute_id: dispute.id }),
      })

      setStatus('success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setErrorMsg(msg)
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">✓</div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          Dispute filed
        </h2>
        <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto">
          Your dispute has been submitted and is under review. If verified, your rebuttal
          will be attached to the report.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Tier selection */}
      <div>
        <p className="label">Verification method *</p>
        <div className="grid grid-cols-2 gap-3 mt-1">
          <button
            type="button"
            onClick={() => setTier('tier_1')}
            className={`text-left p-3 rounded-card border text-sm transition-colors ${
              tier === 'tier_1'
                ? 'border-accent bg-accent/5 text-accent font-medium'
                : 'border-[var(--card-border)] text-[var(--text-secondary)] hover:border-gray-400'
            }`}
          >
            <div className="font-medium mb-0.5">Tier 1 — Email domain</div>
            <div className="text-xs opacity-75">Use a company email address</div>
          </button>
          <button
            type="button"
            onClick={() => setTier('tier_2')}
            className={`text-left p-3 rounded-card border text-sm transition-colors ${
              tier === 'tier_2'
                ? 'border-accent bg-accent/5 text-accent font-medium'
                : 'border-[var(--card-border)] text-[var(--text-secondary)] hover:border-gray-400'
            }`}
          >
            <div className="font-medium mb-0.5">Tier 2 — LinkedIn</div>
            <div className="text-xs opacity-75">Match recruiter LinkedIn profile</div>
          </button>
        </div>
      </div>

      <hr className="border-[var(--card-border)]" />

      {/* Identity */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="disputer_name">Your name</label>
          <input
            id="disputer_name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
          />
        </div>
        <div>
          <label className="label" htmlFor="disputer_email">
            {tier === 'tier_1' ? 'Company email *' : 'Email *'}
          </label>
          <input
            id="disputer_email"
            className="input"
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={
              tier === 'tier_1'
                ? `you@${submission.companies?.domain ?? 'company.com'}`
                : 'you@example.com'
            }
          />
          {tier === 'tier_1' && (
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Must match <strong>{submission.companies?.domain}</strong>
            </p>
          )}
        </div>
      </div>

      {/* LinkedIn — shown for tier 2 */}
      {tier === 'tier_2' && (
        <div>
          <label className="label" htmlFor="linkedin_url">Your LinkedIn URL *</label>
          <input
            id="linkedin_url"
            className="input"
            required
            type="url"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://linkedin.com/in/your-profile"
          />
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Must match the LinkedIn URL on record for this recruiter.
          </p>
        </div>
      )}

      <hr className="border-[var(--card-border)]" />

      {/* Rebuttal */}
      <div>
        <label className="label" htmlFor="rebuttal_text">
          Your rebuttal (optional)
        </label>
        <textarea
          id="rebuttal_text"
          className="input resize-none h-28"
          value={rebuttalText}
          onChange={(e) => setRebuttalText(e.target.value)}
          placeholder="Provide your side of the story. If your dispute is verified, this will be attached to the report."
        />
      </div>

      {status === 'error' && (
        <div className="text-sm text-accent bg-accent/5 border border-accent/20 rounded-lg px-4 py-3">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        className="btn-primary w-full"
        disabled={status === 'submitting'}
      >
        {status === 'submitting' ? 'Filing dispute…' : 'File dispute'}
      </button>

      <p className="text-xs text-center text-[var(--text-secondary)]">
        False dispute filings may result in account action. See our{' '}
        <a href="/about" className="underline hover:text-[var(--text-primary)]">
          community standards
        </a>
        .
      </p>
    </form>
  )
}
