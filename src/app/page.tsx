import { Suspense } from 'react'
import FeedContent from '@/components/feed/FeedContent'

export const revalidate = 60  // ISR every 60s

export default function HomePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-4xl font-serif text-[var(--text-primary)] mb-2">
          Recruiter Accountability,<br />
          <span className="text-accent">Community-Driven.</span>
        </h1>
        <p className="text-[var(--text-secondary)] text-base mt-3 max-w-xl">
          Real reports from real candidates. When recruiters ghost you after interviews,
          the community should know.
        </p>
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
