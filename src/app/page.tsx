import Link from 'next/link'

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
        <div className="flex gap-3">
          <Link href="/submit" className="btn-primary">
            Report a Recruiter
          </Link>
          <Link href="/about" className="btn-secondary">
            How it works
          </Link>
        </div>
      </div>

      {/* Empty state */}
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
        <Link href="/submit" className="btn-primary inline-block">
          Submit the first report
        </Link>
      </div>
    </div>
  )
}
