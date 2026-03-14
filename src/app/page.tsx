import { Suspense } from 'react'
import Link from 'next/link'
import FeedContent from '@/components/feed/FeedContent'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const revalidate = 60  // ISR every 60s

async function fetchStats() {
  const supabase = createServerSupabaseClient()

  const { data } = await supabase
    .from('submissions')
    .select('company_id, category, created_at, interview_date')
    .eq('status', 'published')

  const rows = data ?? []
  const total = rows.length

  const companies = new Set(rows.map((r) => r.company_id)).size

  const ghosts = rows.filter((r) => r.category === 'ghosted_after_interview').length
  const ghostPct = total > 0 ? Math.round((ghosts * 100) / total) : null

  const waitDays = rows
    .map((r) => {
      const submitted = new Date(r.created_at).getTime()
      const incident = new Date(r.interview_date).getTime()
      return (submitted - incident) / (1000 * 60 * 60 * 24)
    })
    .filter((d) => d >= 0)
  const avgWait =
    waitDays.length > 0
      ? Math.round(waitDays.reduce((a, b) => a + b, 0) / waitDays.length)
      : null

  return { total, companies, ghostPct, avgWait }
}

export default async function HomePage() {
  const stats = await fetchStats()

  const STATS = [
    {
      value: stats.total > 0 ? stats.total.toLocaleString() : '—',
      label: 'Reports submitted',
    },
    {
      value: stats.companies > 0 ? stats.companies.toLocaleString() : '—',
      label: 'Companies flagged',
    },
    {
      value: stats.ghostPct != null ? `${stats.ghostPct}%` : '—',
      label: 'Post-interview ghosts',
    },
    {
      value: stats.avgWait != null ? `${stats.avgWait} days` : '—',
      label: 'Avg wait before ghosting',
    },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Hero */}
      <div className="mb-10">
        {/* Eyebrow pill */}
        <div className="inline-flex items-center mb-4">
          <span
            className="text-[#E8453C] uppercase font-medium tracking-wide"
            style={{
              background: '#FFF0EF',
              fontSize: '12px',
              borderRadius: '20px',
              padding: '4px 12px',
            }}
          >
            ACCOUNTABILITY FOR CANDIDATES
          </span>
        </div>

        {/* H1 */}
        <h1
          className="font-serif mb-4"
          style={{ fontSize: '48px', letterSpacing: '-1px', lineHeight: 1.1 }}
        >
          <span style={{ color: '#1a1a1a' }}>Recruiters who ghost deserve to be{' '}</span>
          <em style={{ color: '#E8453C', fontStyle: 'italic' }}>remembered.</em>
        </h1>

        {/* Subtext */}
        <p className="font-sans mb-6 max-w-xl" style={{ fontSize: '16px', color: '#6b6b6b' }}>
          A public record of recruiters who couldn&apos;t extend basic professional courtesy
          after your time and effort.
        </p>

        {/* Hero CTAs */}
        <div className="flex gap-3 mb-8">
          <Link href="/submit" className="btn-primary">
            Report an incident
          </Link>
          <Link href="/about" className="btn-secondary">
            How it works
          </Link>
        </div>

        {/* Stats bar — live from Supabase, "—" when zero */}
        <div className="grid grid-cols-4 gap-4 py-6 border-y border-[rgba(0,0,0,0.08)]">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div
                className="font-serif"
                style={{ fontSize: '28px', color: '#E8453C', lineHeight: 1 }}
              >
                {stat.value}
              </div>
              <div className="text-xs mt-1" style={{ color: '#6b6b6b' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Suspense fallback={<FeedSkeleton />}>
        <FeedContent />
      </Suspense>
    </div>
  )
}

function FeedSkeleton() {
  return (
    <div className="space-y-4 mt-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card animate-pulse">
          <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
          <div className="h-3 bg-gray-100 rounded w-full mb-2" />
          <div className="h-3 bg-gray-100 rounded w-2/3" />
        </div>
      ))}
    </div>
  )
}
