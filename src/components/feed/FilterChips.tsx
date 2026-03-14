'use client'

import type { FilterChip } from '@/lib/types'

const CHIPS: { label: string; value: FilterChip }[] = [
  { label: 'All',                       value: 'all' },
  { label: '👻 Ghosted after interview', value: 'ghosted_after_interview' },
  { label: '🤖 Bot rejection only',      value: 'bot_rejection' },
  { label: '🚪 Cancelled & disappeared', value: 'cancelled_disappeared' },
  { label: '📵 Cold outreach ghost',     value: 'cold_outreach_ghost' },
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
