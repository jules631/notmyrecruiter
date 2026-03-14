'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Submission, Dispute } from '@/lib/types'

interface Props {
  flaggedSubmissions: Submission[]
  pendingDisputes: Dispute[]
  evidenceQueue: Submission[]
}

type Tab = 'evidence' | 'flagged' | 'disputes'

const EVIDENCE_LABELS: Record<string, string> = {
  calendar_invite: 'Calendar invite',
  ats_confirmation: 'ATS confirmation',
  linkedin_message: 'LinkedIn message',
  recruiter_email: 'Recruiter email',
  followup_screenshot: 'Follow-up (no reply)',
}

export default function AdminQueue({ flaggedSubmissions, pendingDisputes, evidenceQueue }: Props) {
  const [tab, setTab] = useState<Tab>('evidence')
  const [actionStatus, setActionStatus] = useState<Record<string, 'loading' | 'done' | 'error'>>({})
  const [screenshotUrls, setScreenshotUrls] = useState<Record<string, string>>({})

  const supabase = createClient()

  async function loadScreenshot(submission: Submission) {
    if (!submission.evidence_storage_path || screenshotUrls[submission.id]) return
    const { data } = await supabase.storage
      .from('evidence')
      .createSignedUrl(submission.evidence_storage_path, 60 * 5) // 5-min signed URL
    if (data?.signedUrl) {
      setScreenshotUrls((prev) => ({ ...prev, [submission.id]: data.signedUrl }))
    }
  }

  async function approveEvidence(submission: Submission) {
    setActionStatus((prev) => ({ ...prev, [submission.id]: 'loading' }))
    const now = new Date().toISOString()

    // Mark evidence reviewed and set deleted_at timestamp
    const { error } = await supabase
      .from('submissions')
      .update({ evidence_reviewed: true, evidence_deleted_at: now })
      .eq('id', submission.id)

    if (error) {
      setActionStatus((prev) => ({ ...prev, [submission.id]: 'error' }))
      return
    }

    // Delete the screenshot from storage
    if (submission.evidence_storage_path) {
      await supabase.storage.from('evidence').remove([submission.evidence_storage_path])
    }

    setActionStatus((prev) => ({ ...prev, [submission.id]: 'done' }))
  }

  async function rejectEvidence(id: string) {
    setActionStatus((prev) => ({ ...prev, [id]: 'loading' }))
    const { error } = await supabase
      .from('submissions')
      .update({ status: 'removed' })
      .eq('id', id)
    setActionStatus((prev) => ({ ...prev, [id]: error ? 'error' : 'done' }))
  }

  async function updateSubmissionStatus(id: string, status: 'published' | 'removed') {
    setActionStatus((prev) => ({ ...prev, [id]: 'loading' }))
    const { error } = await supabase.from('submissions').update({ status }).eq('id', id)
    setActionStatus((prev) => ({ ...prev, [id]: error ? 'error' : 'done' }))
  }

  async function updateDisputeStatus(id: string, status: 'accepted' | 'rejected') {
    setActionStatus((prev) => ({ ...prev, [id]: 'loading' }))
    const { error } = await supabase.from('disputes').update({ status }).eq('id', id)
    setActionStatus((prev) => ({ ...prev, [id]: error ? 'error' : 'done' }))
  }

  const tabClass = (t: Tab) =>
    `pb-2.5 px-1 mr-4 text-sm font-medium border-b-2 transition-colors ${
      tab === t
        ? 'border-accent text-accent'
        : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
    }`

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[var(--card-border)]">
        <button onClick={() => setTab('evidence')} className={tabClass('evidence')}>
          Evidence ({evidenceQueue.length})
        </button>
        <button onClick={() => setTab('flagged')} className={tabClass('flagged')}>
          Flagged ({flaggedSubmissions.length})
        </button>
        <button onClick={() => setTab('disputes')} className={tabClass('disputes')}>
          Disputes ({pendingDisputes.length})
        </button>
      </div>

      {/* ── Evidence review queue ────────────────────────────── */}
      {tab === 'evidence' && (
        <div className="space-y-4">
          {evidenceQueue.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] text-center py-8">
              No submissions awaiting evidence review.
            </p>
          ) : (
            evidenceQueue.map((s) => {
              const st = actionStatus[s.id]
              const isDone = st === 'done'
              const isLoading = st === 'loading'

              return (
                <div key={s.id} className={`card ${isDone ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--text-primary)] mb-0.5">
                        {/* @ts-expect-error – joined data */}
                        {s.recruiters?.name} · {s.companies?.name}
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] mb-2 line-clamp-2">
                        {s.summary}
                      </p>
                      <div className="flex gap-2 items-center flex-wrap">
                        {s.evidence_type && (
                          <span className="inline-flex items-center text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
                            {EVIDENCE_LABELS[s.evidence_type] ?? s.evidence_type}
                          </span>
                        )}
                        <span className="text-xs text-[var(--text-secondary)]">
                          Submitted {new Date(s.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        disabled={isDone || isLoading}
                        onClick={() => approveEvidence(s)}
                        className="btn-secondary text-xs py-1.5 px-3"
                      >
                        Approve
                      </button>
                      <button
                        disabled={isDone || isLoading}
                        onClick={() => rejectEvidence(s.id)}
                        className="bg-accent hover:bg-accent-hover text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>

                  {/* Screenshot viewer */}
                  {s.evidence_storage_path && (
                    <div className="border border-[var(--card-border)] rounded-lg overflow-hidden bg-gray-50">
                      {screenshotUrls[s.id] ? (
                        <img
                          src={screenshotUrls[s.id]}
                          alt="Submitted evidence"
                          className="w-full max-h-64 object-contain"
                        />
                      ) : (
                        <button
                          onClick={() => loadScreenshot(s)}
                          className="w-full py-4 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                          Click to load screenshot
                        </button>
                      )}
                    </div>
                  )}

                  {st === 'error' && (
                    <p className="text-xs text-accent mt-2">Action failed — try again.</p>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── Flagged submissions ──────────────────────────────── */}
      {tab === 'flagged' && (
        <div className="space-y-4">
          {flaggedSubmissions.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] text-center py-8">
              No flagged submissions in queue.
            </p>
          ) : (
            flaggedSubmissions.map((s) => {
              const st = actionStatus[s.id]
              const isDone = st === 'done'
              const isLoading = st === 'loading'

              return (
                <div key={s.id} className={`card ${isDone ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--text-primary)] mb-1">
                        {/* @ts-expect-error – joined data */}
                        {s.recruiters?.name} · {s.companies?.name}
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] mb-2 line-clamp-2">
                        {s.summary}
                      </p>
                      <span className="badge-flagged">{s.flag_count} flags</span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        disabled={isDone || isLoading}
                        onClick={() => updateSubmissionStatus(s.id, 'published')}
                        className="btn-secondary text-xs py-1.5 px-3"
                      >
                        Restore
                      </button>
                      <button
                        disabled={isDone || isLoading}
                        onClick={() => updateSubmissionStatus(s.id, 'removed')}
                        className="bg-accent hover:bg-accent-hover text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  {st === 'error' && (
                    <p className="text-xs text-accent mt-2">Action failed — try again.</p>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── Pending disputes ─────────────────────────────────── */}
      {tab === 'disputes' && (
        <div className="space-y-4">
          {pendingDisputes.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] text-center py-8">
              No pending disputes.
            </p>
          ) : (
            pendingDisputes.map((d) => {
              const st = actionStatus[d.id]
              const isDone = st === 'done'
              const isLoading = st === 'loading'

              return (
                <div key={d.id} className={`card ${isDone ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {d.disputer_name ?? d.disputer_email}
                        </span>
                        <span className={`chip text-xs py-0.5 ${d.standing_verified ? 'chip-active' : 'chip-inactive'}`}>
                          {d.standing_verified ? '✓ Verified' : 'Unverified'} · {d.tier === 'tier_2' ? 'LinkedIn' : 'Email domain'}
                        </span>
                      </div>
                      {d.rebuttal_text && (
                        <p className="text-sm text-[var(--text-secondary)] mb-2 line-clamp-2">
                          &ldquo;{d.rebuttal_text}&rdquo;
                        </p>
                      )}
                      {d.admin_notes && (
                        <p className="text-xs text-[var(--text-secondary)] italic">{d.admin_notes}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        disabled={isDone || isLoading}
                        onClick={() => updateDisputeStatus(d.id, 'accepted')}
                        className="btn-secondary text-xs py-1.5 px-3"
                      >
                        Accept
                      </button>
                      <button
                        disabled={isDone || isLoading}
                        onClick={() => updateDisputeStatus(d.id, 'rejected')}
                        className="bg-accent hover:bg-accent-hover text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                  {st === 'error' && (
                    <p className="text-xs text-accent mt-2">Action failed — try again.</p>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
