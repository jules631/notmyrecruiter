import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Community Standards — NotMyRecruiter',
  description: 'How NotMyRecruiter works, what reports are accepted, and how disputes are handled.',
}

const standards = [
  {
    title: 'What qualifies for a report',
    body: `Reports must be based on a real interview or screening interaction. Qualifying behavior includes: ghosting after one or more interview rounds, reneging on verbal or written offers without explanation, misrepresenting role details, or other demonstrably unprofessional conduct. Reports must not be fabricated, exaggerated, or motivated by personal grievances unrelated to the hiring process.`,
  },
  {
    title: '14-day waiting period',
    body: `All reports require at least 14 days to have passed since your interview date before they are published. This gives recruiters reasonable time to follow up and prevents premature reports from candidates still in process.`,
  },
  {
    title: 'Rate limiting',
    body: `Each verified account may submit one report per company per 90 days. This prevents coordinated campaigns and encourages thoughtful, specific reporting.`,
  },
  {
    title: 'Disputes and rebuttals',
    body: `Recruiters or their representatives may dispute reports. Tier 1 disputes verify company email domain ownership. Tier 2 disputes verify LinkedIn identity. Accepted disputes may result in a rebuttal being attached to the report, giving both sides a voice.`,
  },
  {
    title: 'Flagging and moderation',
    body: `Community members may flag reports that appear false, harassing, or violating these standards. Reports with 5 or more flags are automatically placed under review. Our moderation team reviews flagged content and may remove reports that do not meet our standards.`,
  },
  {
    title: 'What we do not allow',
    body: `We do not allow: personal attacks unrelated to hiring, doxxing, discrimination based on protected characteristics, reports targeting non-recruiting employees, or content intended to damage someone's career for reasons unrelated to their conduct as a recruiter.`,
  },
]

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-serif text-[var(--text-primary)] mb-3">
          Community Standards
        </h1>
        <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
          NotMyRecruiter is a community accountability platform. These standards exist
          to protect both candidates and recruiters from bad-faith actors, and to ensure
          reports are meaningful and fair.
        </p>
      </div>

      <div className="space-y-6">
        {standards.map((s, i) => (
          <div key={i} className="card">
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">
              {s.title}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {s.body}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 p-5 bg-accent/5 border border-accent/20 rounded-card">
        <p className="text-sm text-[var(--text-primary)] leading-relaxed">
          <span className="font-semibold">Questions or concerns?</span> If you believe a
          report violates these standards, use the flag feature on any published report.
          For legal matters, contact us directly.
        </p>
      </div>
    </div>
  )
}
