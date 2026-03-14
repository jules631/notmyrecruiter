import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About — NotMyRecruiter',
  description:
    'How NotMyRecruiter works, community standards, what qualifies as a reportable incident, and how disputes are handled.',
}

const standards = [
  {
    title: 'What this platform is',
    body: `Recruiters are professionals acting in a professional capacity. When a candidate completes an interview, the minimum standard of professional courtesy is a response — even a brief one. This platform documents cases where that standard was not met.\n\nEvery submission is anonymous. Every recruiter is identified by their public LinkedIn profile only — a self-published professional record they have chosen to make public. No personal information beyond professional identity is collected or displayed.`,
  },
  {
    title: 'What qualifies as a reportable incident',
    body: `All four of the following qualify:\n\n1. You completed one or more interviews and received no follow-up — not even a form rejection — after 14 or more days.\n2. A recruiter who initiated contact with you went silent after you responded.\n3. A recruiter cancelled a scheduled interview and never rescheduled, acknowledged your follow-up, or provided any response.\n4. You received only an automated rejection with no human follow-up after a final-round or late-stage interview.`,
  },
  {
    title: 'What does not qualify',
    body: `The following are explicitly not reportable on this platform:\n\n- A recruiter declining to provide feedback on your application or interview performance. This is legally protected conduct and is not a professional failing.\n- A rejection delivered promptly and professionally, even if disappointing.\n- Any conduct that occurred less than 14 days ago. Time-gating exists to prevent premature submissions and reduce false reports.\n- Anything that cannot be characterized as professional conduct — personal grievances, compensation disputes, or matters unrelated to recruiter communication.`,
  },
  {
    title: 'How submissions are verified',
    body: `Tier 1 — Interaction confirmed: Before your report is published you must provide one piece of evidence that the interaction occurred. Accepted evidence includes a screenshot of a calendar invite, an ATS confirmation email, a LinkedIn message thread showing recruiter initiated contact, or an email from the recruiter's company domain. Screenshots are reviewed by an admin and permanently deleted after review. Only the outcome of the review is retained — your evidence is never stored long-term or displayed publicly.\n\nTier 2 — Documented follow-up: You have provided Tier 1 evidence plus a screenshot of a follow-up message you sent that received no response, timestamped at least 14 days after the reported incident. This is the strongest submitter-side verification available and reflects that you acted professionally and were still ignored.\n\nTier 3 — Community verified: A report that has remained published for 90 or more days without a successful dispute and below the community flag threshold earns community verified status. Time and scrutiny are themselves a meaningful signal.\n\nAll submissions are subject to a 14-day gate — no report is published until at least 14 days have elapsed since the reported incident date. Submitters are limited to one report per company per 90-day window. Submissions that cannot provide Tier 1 evidence within 7 days of submission are automatically removed from the pending queue.`,
  },
  {
    title: 'How disputes work',
    body: `Recruiters and companies named in a report have three paths to dispute it:\n\nTier 1 — Recruiter self-identifies: The recruiter submits a dispute from an email address matching their company domain, and provides their LinkedIn URL matching the one on the report. If standing is verified, they may publish a rebuttal statement of up to 500 characters that appears publicly alongside the report. The report itself remains published.\n\nTier 2 — Factual inaccuracy claim: The recruiter provides Tier 1 standing plus email header evidence demonstrating that contact was made. This triggers an admin review. The outcome — report annotated, modified, or removed — is determined solely by the admin. No automated removal path exists.\n\nTier 3 — Legal or formal request: A written request submitted to the LLC's registered agent. This is the only dispute path available to HR or legal teams acting on behalf of a company without recruiter identity verification. Reviewed by admin and counsel as appropriate.\n\nThe following are not valid grounds for removal:\n- A company claiming reputational harm\n- Disagreement with how an experience was characterized\n- Volume of dispute requests from the same company domain\n- A dispute submitted from a personal or non-company email address`,
  },
  {
    title: 'Community flagging',
    body: `Any visitor may flag a report as inaccurate. A report that reaches five flags is automatically placed under review and hidden from the public feed pending admin evaluation. Flags are deduplicated by hashed IP address — one flag per report per visitor.\n\nFlagging a report because you disagree with it, or because you represent the company named, is not a valid use of the flag system. Abuse of the flag system may result in submissions from your network being deprioritized.`,
  },
  {
    title: 'Prohibited content',
    body: `Submissions that contain any of the following will be removed and the submitter account banned:\n\n- Personal attacks, insults, or language targeting the recruiter as a person rather than documenting their professional conduct\n- Identifying information beyond professional identity — home address, personal email, phone number, or any non-public personal detail\n- False or fabricated accounts of events\n- Content submitted on behalf of another person without their knowledge\n- Harassment of any kind`,
  },
  {
    title: 'Legal and platform structure',
    body: `NotMyRecruiter operates as an LLC. As a platform for user-generated content, it is protected under Section 230 of the Communications Decency Act, which provides federal immunity to interactive computer services from liability for content submitted by users.\n\nSubmitters are solely responsible for the accuracy of their submissions. By submitting a report, you attest that the account is truthful, based on your direct personal experience, and does not contain prohibited content as defined above.\n\nFormal legal correspondence should be directed to the registered agent address on file with the state of formation. Contact for all other inquiries: [your contact email]`,
  },
]

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-serif text-[var(--text-primary)] mb-3">
          How this works
        </h1>
        <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
          NotMyRecruiter is a community-maintained accountability record for recruiter
          conduct. It exists because candidates invest significant time, energy, and
          professional credibility in the interview process — and when recruiters go
          silent after that investment, there is currently no accountability mechanism.
          This platform is not a place to vent. It is a factual record of professional
          conduct, maintained to help candidates make informed decisions.
        </p>
      </div>

      <div className="space-y-6">
        {standards.map((s, i) => (
          <div key={i} className="card">
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">
              {s.title}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
              {s.body}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 p-5 bg-accent/5 border border-accent/20 rounded-card">
        <p className="text-sm text-[var(--text-primary)] leading-relaxed">
          <span className="font-semibold">Questions or formal correspondence?</span>{' '}
          For general questions about how the platform works, contact us at [email]. For
          formal legal requests, correspondence must be directed to our registered agent.
          Dispute requests submitted via email rather than the dispute form will not be
          processed.
        </p>
      </div>
    </div>
  )
}
