'use client'

import { useState, type FormEvent, type ChangeEvent } from 'react'
import { createClient } from '@/lib/supabase'
import type { EvidenceType } from '@/lib/types'

interface FormState {
  recruiter_name: string
  recruiter_title: string
  recruiter_linkedin: string
  company_name: string
  company_domain: string
  role_applied: string
  interview_date: string
  last_contact_date: string
  summary: string
  submitter_email: string
}

const INITIAL: FormState = {
  recruiter_name: '',
  recruiter_title: '',
  recruiter_linkedin: '',
  company_name: '',
  company_domain: '',
  role_applied: '',
  interview_date: '',
  last_contact_date: '',
  summary: '',
  submitter_email: '',
}

const EVIDENCE_OPTIONS: { value: EvidenceType; label: string; description: string }[] = [
  {
    value: 'calendar_invite',
    label: 'Calendar invite',
    description: 'An invite from the recruiter or company domain for a scheduled interview.',
  },
  {
    value: 'ats_confirmation',
    label: 'ATS confirmation email',
    description: 'An automated confirmation from an applicant tracking system confirming an interview was scheduled.',
  },
  {
    value: 'linkedin_message',
    label: 'LinkedIn message thread',
    description: 'A screenshot of a LinkedIn message thread showing the recruiter initiated contact with you.',
  },
  {
    value: 'recruiter_email',
    label: 'Email from recruiter',
    description: 'An email sent from the recruiter using a company domain address.',
  },
  {
    value: 'followup_screenshot',
    label: 'Follow-up you sent — no reply (Tier 2)',
    description: 'A screenshot of a follow-up message you sent that received no response, timestamped at least 14 days after the incident. This earns a stronger verification signal.',
  },
]

export default function SubmissionForm() {
  const [form, setForm] = useState<FormState>(INITIAL)
  const [evidenceType, setEvidenceType] = useState<EvidenceType | ''>('')
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const charCount = form.summary.length
  const charLimit = 150

  function set(field: keyof FormState) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value =
        field === 'summary'
          ? e.target.value.slice(0, charLimit)
          : e.target.value
      setForm((prev) => ({ ...prev, [field]: value }))
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setEvidenceFile(e.target.files?.[0] ?? null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setErrorMsg('')

    if (!evidenceType) {
      setErrorMsg('Please select an evidence type.')
      setStatus('error')
      return
    }
    if (!evidenceFile) {
      setErrorMsg('Please upload a screenshot as evidence.')
      setStatus('error')
      return
    }

    try {
      const supabase = createClient()

      // 1. Upsert company
      let companyId: string

      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('domain', form.company_domain.toLowerCase().trim())
        .single()

      if (existingCompany) {
        companyId = existingCompany.id
      } else {
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({ name: form.company_name.trim(), domain: form.company_domain.toLowerCase().trim() })
          .select('id')
          .single()

        if (companyError || !newCompany) throw new Error('Could not create company')
        companyId = newCompany.id
      }

      // 2. Upsert recruiter
      let recruiterId: string

      const linkedinUrl = form.recruiter_linkedin.trim() || null

      if (linkedinUrl) {
        const { data: existingRecruiter } = await supabase
          .from('recruiters')
          .select('id')
          .eq('linkedin_url', linkedinUrl)
          .single()

        if (existingRecruiter) {
          recruiterId = existingRecruiter.id
        } else {
          const { data: newRecruiter, error: recruiterError } = await supabase
            .from('recruiters')
            .insert({
              company_id: companyId,
              name: form.recruiter_name.trim(),
              title: form.recruiter_title.trim() || null,
              linkedin_url: linkedinUrl,
            })
            .select('id')
            .single()

          if (recruiterError || !newRecruiter) throw new Error('Could not create recruiter')
          recruiterId = newRecruiter.id
        }
      } else {
        const { data: newRecruiter, error: recruiterError } = await supabase
          .from('recruiters')
          .insert({
            company_id: companyId,
            name: form.recruiter_name.trim(),
            title: form.recruiter_title.trim() || null,
          })
          .select('id')
          .single()

        if (recruiterError || !newRecruiter) throw new Error('Could not create recruiter')
        recruiterId = newRecruiter.id
      }

      // 3. Upsert submitter
      const { data: { user } } = await supabase.auth.getUser()

      let submitterId: string

      const { data: existingSubmitter } = await supabase
        .from('submitters')
        .select('id')
        .eq('email', form.submitter_email.toLowerCase().trim())
        .single()

      if (existingSubmitter) {
        submitterId = existingSubmitter.id
      } else {
        const { data: newSubmitter, error: submitterError } = await supabase
          .from('submitters')
          .insert({
            email: form.submitter_email.toLowerCase().trim(),
            auth_user_id: user?.id ?? null,
            email_verified: false,
          })
          .select('id')
          .single()

        if (submitterError || !newSubmitter) throw new Error('Could not create submitter record')
        submitterId = newSubmitter.id
      }

      // 4. Insert submission (get ID first for storage path)
      const { data: newSubmission, error: submissionError } = await supabase
        .from('submissions')
        .insert({
          submitter_id: submitterId,
          recruiter_id: recruiterId,
          company_id: companyId,
          summary: form.summary.trim(),
          interview_date: form.interview_date,
          last_contact_date: form.last_contact_date || null,
          role_applied: form.role_applied.trim() || null,
          status: 'pending',
          evidence_type: evidenceType,
          evidence_reviewed: false,
          verification_tier: 'email_only',
        })
        .select('id')
        .single()

      if (submissionError || !newSubmission) throw submissionError ?? new Error('Could not create submission')

      // 5. Upload evidence to Supabase Storage
      const ext = evidenceFile.name.split('.').pop() ?? 'bin'
      const storagePath = `evidence/${newSubmission.id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('evidence')
        .upload(storagePath, evidenceFile, { upsert: false })

      if (uploadError) throw new Error('Could not upload evidence file')

      // 6. Store storage path on submission
      await supabase
        .from('submissions')
        .update({ evidence_storage_path: storagePath })
        .eq('id', newSubmission.id)

      setStatus('success')
      setForm(INITIAL)
      setEvidenceType('')
      setEvidenceFile(null)
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
          Report submitted
        </h2>
        <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto">
          Your report is pending evidence review. Once your screenshot is reviewed and
          the 14-day waiting period has passed, it will be published.
        </p>
        <button
          className="btn-secondary mt-6"
          onClick={() => setStatus('idle')}
        >
          Submit another
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Recruiter info */}
      <fieldset>
        <legend className="text-sm font-semibold text-[var(--text-primary)] mb-3">
          Recruiter
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="recruiter_name">Full name *</label>
            <input id="recruiter_name" className="input" required value={form.recruiter_name} onChange={set('recruiter_name')} placeholder="Jane Smith" />
          </div>
          <div>
            <label className="label" htmlFor="recruiter_title">Title</label>
            <input id="recruiter_title" className="input" value={form.recruiter_title} onChange={set('recruiter_title')} placeholder="Senior Recruiter" />
          </div>
        </div>
        <div className="mt-3">
          <label className="label" htmlFor="recruiter_linkedin">LinkedIn URL</label>
          <input id="recruiter_linkedin" className="input" value={form.recruiter_linkedin} onChange={set('recruiter_linkedin')} placeholder="https://linkedin.com/in/..." type="url" />
        </div>
      </fieldset>

      <hr className="border-[var(--card-border)]" />

      {/* Company info */}
      <fieldset>
        <legend className="text-sm font-semibold text-[var(--text-primary)] mb-3">
          Company
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="company_name">Company name *</label>
            <input id="company_name" className="input" required value={form.company_name} onChange={set('company_name')} placeholder="Acme Corp" />
          </div>
          <div>
            <label className="label" htmlFor="company_domain">Domain *</label>
            <input id="company_domain" className="input" required value={form.company_domain} onChange={set('company_domain')} placeholder="acme.com" />
          </div>
        </div>
        <div className="mt-3">
          <label className="label" htmlFor="role_applied">Role you applied for</label>
          <input id="role_applied" className="input" value={form.role_applied} onChange={set('role_applied')} placeholder="Software Engineer, L4" />
        </div>
      </fieldset>

      <hr className="border-[var(--card-border)]" />

      {/* Dates */}
      <fieldset>
        <legend className="text-sm font-semibold text-[var(--text-primary)] mb-3">
          Timeline
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="interview_date">Interview date *</label>
            <input id="interview_date" className="input" required type="date" value={form.interview_date} onChange={set('interview_date')} max={new Date().toISOString().split('T')[0]} />
          </div>
          <div>
            <label className="label" htmlFor="last_contact_date">Last contact date</label>
            <input id="last_contact_date" className="input" type="date" value={form.last_contact_date} onChange={set('last_contact_date')} />
          </div>
        </div>
      </fieldset>

      <hr className="border-[var(--card-border)]" />

      {/* Evidence — verify your experience */}
      <fieldset>
        <legend className="text-sm font-semibold text-[var(--text-primary)] mb-1">
          Verify your experience *
        </legend>
        <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
          A screenshot is required to verify the interaction occurred before your report
          can be published. Select the type of evidence you are providing below.
        </p>

        {/* Evidence type dropdown */}
        <div className="mb-3">
          <label className="label" htmlFor="evidence_type">Evidence type *</label>
          <select
            id="evidence_type"
            className="input"
            required
            value={evidenceType}
            onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}
          >
            <option value="">Select evidence type…</option>
            {EVIDENCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {evidenceType && (
            <p className="text-xs text-[var(--text-secondary)] mt-1.5">
              {EVIDENCE_OPTIONS.find((o) => o.value === evidenceType)?.description}
            </p>
          )}
        </div>

        {/* Accepted types reference */}
        <div className="rounded-lg border border-[var(--card-border)] bg-gray-50/60 p-3 mb-3 space-y-1.5">
          <p className="text-xs font-medium text-[var(--text-primary)] mb-2">Accepted evidence</p>
          {EVIDENCE_OPTIONS.map((opt) => (
            <div key={opt.value} className="flex gap-2 text-xs text-[var(--text-secondary)]">
              <span className="text-[var(--text-primary)] font-medium shrink-0">·</span>
              <span>
                <span className="font-medium text-[var(--text-primary)]">{opt.label}</span>
                {' — '}
                {opt.description}
              </span>
            </div>
          ))}
        </div>

        {/* File upload */}
        <div className="mb-3">
          <label className="label" htmlFor="evidence_file">Upload screenshot *</label>
          <input
            id="evidence_file"
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            required
            onChange={handleFileChange}
            className="block w-full text-sm text-[var(--text-secondary)] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-[var(--card-border)] file:text-xs file:font-medium file:text-[var(--text-primary)] file:bg-white hover:file:bg-gray-50 file:cursor-pointer cursor-pointer"
          />
          {evidenceFile && (
            <p className="text-xs text-[var(--text-secondary)] mt-1.5">
              Selected: <span className="font-medium text-[var(--text-primary)]">{evidenceFile.name}</span>
              {' '}({(evidenceFile.size / 1024).toFixed(0)} KB)
            </p>
          )}
        </div>

        {/* Privacy notice */}
        <div className="flex gap-2 items-start bg-blue-50/60 border border-blue-100 rounded-lg px-3 py-2.5">
          <svg className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p className="text-xs text-blue-700 leading-relaxed">
            Your screenshot is reviewed by an admin and permanently deleted after review.
            It is never stored long-term or displayed publicly.
          </p>
        </div>
      </fieldset>

      <hr className="border-[var(--card-border)]" />

      {/* Summary */}
      <div>
        <label className="label" htmlFor="summary">
          What happened? *
          <span className={`ml-2 font-normal ${charCount >= charLimit ? 'text-accent' : 'text-[var(--text-secondary)]'}`}>
            {charCount}/{charLimit}
          </span>
        </label>
        <textarea
          id="summary"
          className="input resize-none h-24"
          required
          value={form.summary}
          onChange={set('summary')}
          placeholder="Brief, factual description of what happened (max 150 characters)…"
          maxLength={charLimit}
        />
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Keep it factual. Avoid names of third parties not involved in the hiring process.
        </p>
      </div>

      <hr className="border-[var(--card-border)]" />

      {/* Email */}
      <div>
        <label className="label" htmlFor="submitter_email">Your email * (for verification)</label>
        <input id="submitter_email" className="input" required type="email" value={form.submitter_email} onChange={set('submitter_email')} placeholder="you@example.com" />
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          We&apos;ll send a verification link. Your email is never shown publicly.
        </p>
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
        {status === 'submitting' ? 'Submitting…' : 'Submit report'}
      </button>

      <p className="text-xs text-center text-[var(--text-secondary)]">
        By submitting you agree to our{' '}
        <a href="/about" className="underline hover:text-[var(--text-primary)]">
          community standards
        </a>
        .
      </p>
    </form>
  )
}
