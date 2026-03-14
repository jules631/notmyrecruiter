'use client'

import type { FilterChip } from '@/lib/types'

const CHIPS: { label: string; value: FilterChip }[] = [
  { label: 'Recent', value: 'recent' },
  { label: 'Most flagged', value: 'most_flagged' },
  { label: 'Disputed', value: 'disputed' },
]

interface Props {
  active: FilterChip
  onChange: (filter: FilterChip) => void
}

export default function FilterChips({ active, onChange }: Props) {
  return (
    <div className="flex gap-2 flex-wrap">
      {CHIPS.map((chip) => (
        <button
          key={chip.value}
          onClick={() => onChange(chip.value)}
          className={`chip ${active === chip.value ? 'chip-active' : 'chip-inactive'}`}
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}
