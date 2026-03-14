'use client'

interface Props {
  value: string
  onChange: (v: string) => void
}

export default function SearchBar({ value, onChange }: Props) {
  return (
    <div className="relative">
      <svg
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] w-4 h-4 pointer-events-none"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <circle cx={11} cy={11} r={8} />
        <path strokeLinecap="round" d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="search"
        placeholder="Search recruiter, company, or role…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input pl-10"
      />
    </div>
  )
}
