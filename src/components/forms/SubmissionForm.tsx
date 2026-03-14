'use client'

import { useState, type FormEvent, type ChangeEvent } from 'react'
import { createClient } from '@/lib/supabase'
import type { EvidenceType, SubmissionCategory } from '@/lib/types'

interface FormState {
  recruiter_name: string
  recruiter_title: string
  recruiter_linkedin: string
  company_name: string
  incident_month: string
  incident_year: string
  summary: string
  submitter_email: string
}

const INITIAL: FormState = {
  recruiter_name: '',
  recruiter_title: '',
  recruiter_linkedin: '',
  company_name: '',
  incident_month: '',
  incident_year: '',
  summary: '',
  submitter_email: '',
}

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => String(currentYear - i))

const CATEGORIES: { value: SubmissionCategory; icon: string; label: string; description: string }[] = [
  {
    value: 'ghosted_after_interview',
    icon: '👻',
    label: 'Ghosted after interview',
    description: 'No follow-up after you interviewed',
  },
  {
    value: 'bot_rejection',
    icon: '🤖',
    label: 'Bot rejection only',
    description: 'Just a form email, no human contact',
  },
  {
    value: 'cancelled_disappeared',
    icon: '🚪',
    label: 'Cancelled & disappeared',
    description: 'Recruiter cancelled, never followed up',
  },
  {
    value: 'cold_outreach_ghost',
    icon: '📵',
    label: 'Cold outreach ghost',
    description: 'They reached out, then went silent',
  },
]

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
    description: 'A screenshot of a follow-up message you sent that received no response, timestamped at least 14 days after the incident.',
  },
]

const STEP_SUBTITLES = [
  'Tell us who ghosted you.',
  'Tell us what happened and when.',
  'Upload evidence of the interaction.',
  'Add context and confirm your report.',
]

function ProgressIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full transition-all duration-200"
            style={{
              background:
                n < step ? '#1a1a1a' : n === step ? '#E8453C' : '#d4d4d4',
              width: n === step ? '10px' : '8px',
              height: n === step ? '10px' : '8px',
            }}
          />
          {n < 4 && (
            <div
              className="h-px w-8 transition-colors duration-200"
              style={{ background: n < step ? '#1a1a1a' : '#d4d4d4' }}
            />
          )}
        </div>
      ))}
      <span className="ml-1 text-xs text-[var(--text-secondary)]">
        Step {step} of 4
      </span>
    </div>
  )
}

export default function SubmissionForm() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>(INITIAL)
  const [category, setCategory] = useState<SubmissionCategory | ''>('')
  const [evidenceType, setEvidenceType] = useState<EvidenceType | ''>('')
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const charCount = form.summary.length
  const charLimit = 150

  function set(field: keyof FormState) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = field === 'summary' ? e.target.value.slice(0, charLimit) : e.target.value
      setForm((prev) => ({ ...prev, [field]: value }))
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setEvidenceFile(e.target.files?.[0] ?? null)
  }

  // Per-step "Next" gate — all required fields on current step filled
  const canProceed =
    step === 1
      ? Boolean(form.recruiter_name.trim() && form.recruiter_linkedin.trim() && form.company_name.trim())
      : step === 2
      ? Boolean(form.incident_month && form.incident_year && category)
      : step === 3
      ? Boolean(evidenceType && evidenceFile)
      : Boolean(form.summary.trim() && form.submitter_email.trim())

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (step < 4) {
      if (canProceed) setStep((s) => s + 1)
      return
    }

    setStatus('submitting')
    setErrorMsg('')

    try {
      const supabase = createClient()

      // 1. Upsert company
      let companyId: string
      const companyName = form.company_name.trim()

      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .ilike('name', companyName)
        .single()

      if (existingCompany) {
        companyId = existingCompany.id
      } else {
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({ name: companyName })
          .select('id')
          .single()

        if (companyError || !newCompany) throw new Error('Could not create company')
        companyId = newCompany.id
      }

      // 2. Upsert recruiter
      let recruiterId: string
      const linkedinUrl = form.recruiter_linkedin.trim()

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

      // 4. Insert submission
      const interviewDate = `${form.incident_year}-${form.incident_month}-01`

      const { data: newSubmission, error: submissionError } = await supabase
        .from('submissions')
        .insert({
          submitter_id: submitterId,
          recruiter_id: recruiterId,
          company_id: companyId,
          category,
          summary: form.summary.trim(),
          interview_date: interviewDate,
          status: 'pending',
          evidence_type: evidenceType,
          evidence_reviewed: false,
          verification_tier: 'email_only',
        })
        .select('id')
        .single()

      if (submissionError || !newSubmission) throw submissionError ?? new Error('Could not create submission')

      // 5. Upload evidence
      const ext = evidenceFile!.name.split('.').pop() ?? 'bin'
      const storagePath = `evidence/${newSubmission.id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('evidence')
        .upload(storagePath, evidenceFile!, { upsert: false })

      if (uploadError) throw new Error('Could not upload evidence file')

      // 6. Store storage path
      await supabase
        .from('submissions')
        .update({ evidence_storage_path: storagePath })
        .eq('id', newSubmission.id)

      setStatus('success')
      setForm(INITIAL)
      setCategory('')
      setEvidenceType('')
      setEvidenceFile(null)
      setStep(1)
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
        <button className="btn-secondary mt-6" onClick={() => setStatus('idle')}>
          Submit another
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ProgressIndicator step={step} />

      {/* Step 1 — Who ghosted you? */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="recruiter_name">Full name *</label>
              <input
                id="recruiter_name"
                className="input"
                required
                value={form.recruiter_name}
                onChange={set('recruiter_name')}
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="label" htmlFor="recruiter_title">Title</label>
              <input
                id="recruiter_title"
                className="input"
                value={form.recruiter_title}
                onChange={set('recruiter_title')}
                placeholder="Senior Technical Recruiter"
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="recruiter_linkedin">LinkedIn URL *</label>
            <input
              id="recruiter_linkedin"
              className="input"
              required
              type="url"
              value={form.recruiter_linkedin}
              onChange={set('recruiter_linkedin')}
              placeholder="https://linkedin.com/in/..."
            />
            <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
              Used as the identity source of truth. Ensures the right person is identified.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="company_name">Company name *</label>
            <input
              id="company_name"
              className="input"
              required
              value={form.company_name}
              onChange={set('company_name')}
              placeholder="Acme Corp"
            />
          </div>
        </div>
      )}

      {/* Step 2 — What happened? */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="incident_month">Month of incident *</label>
              <select
                id="incident_month"
                className="input"
                required
                value={form.incident_month}
                onChange={set('incident_month')}
              >
                <option value="">Month…</option>
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="incident_year">Year of incident *</label>
              <select
                id="incident_year"
                className="input"
                required
                value={form.incident_year}
                onChange={set('incident_year')}
              >
                <option value="">Year…</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)] mb-3">What happened? *</p>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`text-left rounded-[10px] border p-4 transition-all duration-150 ${
                    category === cat.value
                      ? 'border-accent bg-accent/5 ring-1 ring-accent/30'
                      : 'border-[rgba(0,0,0,0.1)] bg-white hover:border-[rgba(0,0,0,0.2)] hover:shadow-sm'
                  }`}
                >
                  <div className="text-2xl mb-1.5">{cat.icon}</div>
                  <div className="text-sm font-medium text-[var(--text-primary)] leading-snug mb-0.5">
                    {cat.label}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] leading-snug">
                    {cat.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 3 — Verify your experience */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            A screenshot is required to verify the interaction occurred before your report
            can be published. Select the type of evidence you are providing below.
          </p>
          <div>
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
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {evidenceType && (
              <p className="text-xs text-[var(--text-secondary)] mt-1.5">
                {EVIDENCE_OPTIONS.find((o) => o.value === evidenceType)?.description}
              </p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="evidence_file">Upload file *</label>
            <input
              id="evidence_file"
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              required
              onChange={handleFileChange}
              className="block w-full text-sm text-[var(--text-secondary)] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-[var(--card-border)] file:text-xs file:font-medium file:text-[var(--text-primary)] file:bg-white hover:file:bg-gray-50 file:cursor-pointer cursor-pointer"
            />
            <p className="text-xs text-[var(--text-secondary)] mt-1">Accepted: JPG, PNG, PDF</p>
            {evidenceFile && (
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Selected: <span className="font-medium text-[var(--text-primary)]">{evidenceFile.name}</span>
                {' '}({(evidenceFile.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>
          <div className="flex gap-2 items-start bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
            <svg className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-blue-700 leading-relaxed">
              Your screenshot is reviewed by an admin and permanently deleted after review.
              It is never stored long-term or displayed publicly.
            </p>
          </div>
        </div>
      )}

      {/* Step 4 — Final details */}
      {step === 4 && (
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="summary">
              Summary *
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
          <div>
            <label className="label" htmlFor="submitter_email">Your email *</label>
            <input
              id="submitter_email"
              className="input"
              required
              type="email"
              value={form.submitter_email}
              onChange={set('submitter_email')}
              placeholder="you@example.com"
            />
            <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
              For verification only. Never stored in plaintext or displayed publicly.
            </p>
          </div>
        </div>
      )}

      {/* Error message */}
      {status === 'error' && (
        <div className="text-sm text-accent bg-accent/5 border border-accent/20 rounded-lg px-4 py-3">
          {errorMsg}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        {step > 1 ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setStep((s) => s - 1)}
          >
            Back
          </button>
        ) : (
          <span />
        )}

        {step < 4 ? (
          <button
            type="button"
            className="btn-primary"
            disabled={!canProceed}
            onClick={() => setStep((s) => s + 1)}
            style={{ opacity: canProceed ? 1 : 0.45, cursor: canProceed ? 'pointer' : 'not-allowed' }}
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            className="btn-primary"
            disabled={status === 'submitting' || !canProceed}
            style={{ opacity: canProceed ? 1 : 0.45, cursor: canProceed && status !== 'submitting' ? 'pointer' : 'not-allowed' }}
          >
            {status === 'submitting' ? 'Submitting…' : 'Submit report'}
          </button>
        )}
      </div>

      {step === 4 && (
        <p className="text-xs text-center text-[var(--text-secondary)]">
          By submitting you agree to our{' '}
          <a href="/about" className="underline hover:text-[var(--text-primary)]">
            community standards
          </a>
          .
        </p>
      )}
    </form>
  )
}
