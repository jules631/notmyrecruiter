'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Submission, Dispute } from '@/lib/types'

interface Props {
  flaggedSubmissions: Submission[]
  pendingDisputes: Dispute[]
}

type Tab = 'flagged' | 'disputes'

export default function AdminQueue({ flaggedSubmissions, pendingDisputes }: Props) {
  const [tab, setTab] = useState<Tab>('flagged')
  const [actionStatus, setActionStatus] = useState<Record<string, 'loading' | 'done' | 'error'>>({})

  const supabase = createClient()

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

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[var(--card-border)]">
        <button
          onClick={() => setTab('flagged')}
          className={`pb-2.5 px-1 mr-4 text-sm font-medium border-b-2 transition-colors ${
            tab === 'flagged'
              ? 'border-accent text-accent'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Flagged ({flaggedSubmissions.length})
        </button>
        <button
          onClick={() => setTab('disputes')}
          className={`pb-2.5 px-1 text-sm font-medium border-b-2 transition-colors ${
            tab === 'disputes'
              ? 'border-accent text-accent'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Disputes ({pendingDisputes.length})
        </button>
      </div>

      {/* Flagged submissions */}
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

      {/* Pending disputes */}
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
