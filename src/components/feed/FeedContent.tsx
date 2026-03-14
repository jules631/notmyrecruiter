'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { FilterChip, SubmissionWithDetails } from '@/lib/types'
import FilterChips from './FilterChips'
import SearchBar from './SearchBar'
import FeedCard from './FeedCard'

export default function FeedContent() {
  const [filter, setFilter] = useState<FilterChip>('recent')
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

    if (filter === 'recent') {
      query = query.order('published_at', { ascending: false })
    } else if (filter === 'most_flagged') {
      query = query.order('flag_count', { ascending: false })
    } else if (filter === 'disputed') {
      query = query.eq('has_rebuttal', true).order('published_at', { ascending: false })
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
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} />
        </div>
        <FilterChips active={filter} onChange={setFilter} />
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
        <div className="text-center py-16 text-[var(--text-secondary)]">
          <div className="text-3xl mb-3">🔍</div>
          <p className="text-sm">
            {search ? 'No reports match your search.' : 'No published reports yet.'}
          </p>
          {!search && (
            <a href="/submit" className="btn-primary inline-block mt-4">
              Be the first to report
            </a>
          )}
        </div>
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
