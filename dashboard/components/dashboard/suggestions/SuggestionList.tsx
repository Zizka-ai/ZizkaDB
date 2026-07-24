'use client'

import { useMemo, useState } from 'react'
import { colors, radii } from '@/lib/design-tokens'
import { CATEGORY_META, sortSuggestions } from '@/lib/suggestions'
import type { Suggestion, SuggestionCategory, SuggestionEvidence } from '@/lib/api'
import { SuggestionCard } from './SuggestionCard'

/** Sorted (severity → confidence) list with optional category filter chips. */
export function SuggestionList({
  suggestions,
  evidence,
}: {
  suggestions: Suggestion[]
  evidence: SuggestionEvidence[]
}) {
  const [active, setActive] = useState<SuggestionCategory | null>(null)

  const evidenceById = useMemo(
    () => Object.fromEntries(evidence.map((e) => [e.id, e])),
    [evidence],
  )

  const present = useMemo(() => {
    const seen = new Set<SuggestionCategory>()
    for (const s of suggestions) seen.add(s.category)
    return (Object.keys(CATEGORY_META) as SuggestionCategory[]).filter((c) => seen.has(c))
  }, [suggestions])

  const sorted = useMemo(() => sortSuggestions(suggestions), [suggestions])
  const visible = active ? sorted.filter((s) => s.category === active) : sorted

  return (
    <div className="space-y-4">
      {present.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Chip label="All" active={active === null} onClick={() => setActive(null)} />
          {present.map((c) => (
            <Chip
              key={c}
              label={CATEGORY_META[c].label}
              active={active === c}
              onClick={() => setActive(c)}
            />
          ))}
        </div>
      )}

      <div className="grid gap-4">
        {visible.map((s, i) => (
          <SuggestionCard key={`${s.category}-${s.title}-${i}`} suggestion={s} evidenceById={evidenceById} />
        ))}
      </div>
    </div>
  )
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-medium px-2.5 py-1 transition-colors"
      style={{
        borderRadius: radii.full,
        background: active ? colors.surfaceHover : 'transparent',
        color: active ? colors.textStrong : colors.textMuted,
        border: `1px solid ${active ? colors.borderStrong : colors.border}`,
      }}
    >
      {label}
    </button>
  )
}
