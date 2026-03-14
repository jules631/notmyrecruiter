'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { FilterChip, SubmissionWithDetails } from '@/lib/types'
import FilterChips from './FilterChips'
import SearchBar from './SearchBar'
import FeedCard from './FeedCard'

export default function FeedContent() {
  const [filter, setFilter] = useState<FilterChip>('all')
  const [search, setSearch] = useState('')
  const [submissions, setSubmissions] = useState<SubmissionWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSubmissions = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('submissions')
      .select(`*, recruiters (*, companies (*)), companies (*)`)
      .eq('status', 'published')
      .order('published_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('category', filter)
    }

    if (search.trim()) {
      query = query.or(`summary.ilike.%${search}%`)
    }

    const { data, error } = await query.limit(50)

    if (!error && data) {
      let results = data as unknown as SubmissionWithDetails[]

      // Client-side search filter for recruiter/company name
      if (search.trim()) {
        const q = search.toLowerCase()
        results = results.filter(
          (s) =>
            s.recruiters?.name?.toLowerCase().includes(q) ||
            s.companies?.name?.toLowerCase().includes(q) ||
            s.summary.toLowerCase().includes(q)
        )
      }

      setSubmissions(results)
    }

    setLoading(false)
  }, [filter, search])

  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  return (
    <div>
      {/* Controls: chips left, search right */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex-1">
          <FilterChips active={filter} onChange={setFilter} />
        </div>
        <div className="sm:w-48 shrink-0">
          <SearchBar value={search} onChange={setSearch} />
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-full mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : submissions.length === 0 ? (
        (search || filter !== 'all') ? (
          <div className="text-center py-16">
            <div className="text-3xl mb-3">🔍</div>
            <p className="text-sm text-[var(--text-secondary)] mb-4">No reports match your search.</p>
            <button
              onClick={() => { setFilter('all'); setSearch('') }}
              className="btn-secondary text-sm"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="text-center" style={{ padding: '48px 24px' }}>
            <div style={{ fontSize: '64px', lineHeight: 1, marginBottom: '16px' }}>👻</div>
            <h2
              className="font-serif"
              style={{ fontSize: '24px', color: '#1a1a1a', marginBottom: '12px' }}
            >
              No reports yet
            </h2>
            <p
              className="font-sans mx-auto"
              style={{
                fontSize: '14px',
                color: '#6b6b6b',
                maxWidth: '360px',
                lineHeight: 1.6,
                marginBottom: '24px',
              }}
            >
              Reports appear here after the community submits and verifies them.
              Know a recruiter who ghosted you? Be the first.
            </p>
            <a href="/submit" className="btn-primary inline-block">
              Submit the first report
            </a>
          </div>
        )
      ) : (
        <div className="space-y-4">
          {submissions.map((s) => (
            <FeedCard key={s.id} submission={s} />
          ))}
        </div>
      )}

      {submissions.length > 0 && (
        <p className="text-center text-xs text-[var(--text-secondary)] mt-8">
          {submissions.length} report{submissions.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
