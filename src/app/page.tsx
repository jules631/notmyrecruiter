import { Suspense } from 'react'
import FeedContent from '@/components/feed/FeedContent'

export const revalidate = 60  // ISR every 60s

export default function HomePage() {
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
            Community-driven accountability
          </span>
        </div>

        {/* H1 */}
        <h1
          className="font-serif text-[#1a1a1a] mb-4"
          style={{ fontSize: '48px', letterSpacing: '-1px', lineHeight: 1.1 }}
        >
          Recruiter Accountability,<br />
          <span style={{ color: '#E8453C' }}>Community-Driven.</span>
        </h1>

        {/* Subtext */}
        <p className="font-sans mb-8 max-w-xl" style={{ fontSize: '16px', color: '#6b6b6b' }}>
          Real reports from real candidates. When recruiters ghost you after interviews,
          the community should know.
        </p>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-4 py-6 border-y border-[rgba(0,0,0,0.08)]">
          {[
            { number: '2.4k', label: 'Reports filed' },
            { number: '89%', label: 'Verified reports' },
            { number: '14d', label: 'Avg. review time' },
            { number: '340', label: 'Companies tracked' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div
                className="font-serif"
                style={{ fontSize: '28px', color: '#E8453C', lineHeight: 1 }}
              >
                {stat.number}
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
