'use client'

import { useMemo, useState } from 'react'
import { colors, radii } from '@/lib/design-tokens'
import { TOKEN_OPT_CATEGORY_META, TOKEN_OPT_SEVERITY_META, sortTokenOptSuggestions } from '@/lib/token-optimization'
import type { TokenOptCategory, TokenOptSeverity, TokenOptimizationSuggestion } from '@/lib/api'
import { TokenOptimizationCard } from './TokenOptimizationCard'

/**
 * Sorted (severity → savings) list with client-side category and severity
 * filter chips. Mirrors AI Suggestions' SuggestionList structure. No server
 * round-trip for filtering — the full per-agent list is capped at
 * MAX_SUGGESTIONS (12) server-side, so filtering a list this small is purely
 * a rendering concern, not a query concern.
 */
export function TokenOptimizationList({ suggestions }: { suggestions: TokenOptimizationSuggestion[] }) {
  const [activeCategory, setActiveCategory] = useState<TokenOptCategory | null>(null)
  const [activeSeverity, setActiveSeverity] = useState<TokenOptSeverity | null>(null)

  const presentCategories = useMemo(() => {
    const seen = new Set<TokenOptCategory>()
    for (const s of suggestions) seen.add(s.category)
    return (Object.keys(TOKEN_OPT_CATEGORY_META) as TokenOptCategory[]).filter((c) => seen.has(c))
  }, [suggestions])

  const presentSeverities = useMemo(() => {
    const seen = new Set<TokenOptSeverity>()
    for (const s of suggestions) seen.add(s.severity)
    return (Object.keys(TOKEN_OPT_SEVERITY_META) as TokenOptSeverity[]).filter((s) => seen.has(s))
  }, [suggestions])

  const sorted = useMemo(() => sortTokenOptSuggestions(suggestions), [suggestions])
  const visible = sorted.filter(
    (s) => (!activeCategory || s.category === activeCategory) && (!activeSeverity || s.severity === activeSeverity),
  )

  return (
    <div className="space-y-4">
      {(presentCategories.length > 1 || presentSeverities.length > 1) && (
        <div className="flex flex-col gap-2">
          {presentCategories.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap" role="tablist" aria-label="Filter by category">
              <Chip label="All categories" active={activeCategory === null} onClick={() => setActiveCategory(null)} />
              {presentCategories.map((c) => (
                <Chip
                  key={c}
                  label={TOKEN_OPT_CATEGORY_META[c].label}
                  active={activeCategory === c}
                  onClick={() => setActiveCategory(c)}
                />
              ))}
            </div>
          )}
          {presentSeverities.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap" role="tablist" aria-label="Filter by severity">
              <Chip label="All severities" active={activeSeverity === null} onClick={() => setActiveSeverity(null)} />
              {presentSeverities.map((s) => (
                <Chip
                  key={s}
                  label={TOKEN_OPT_SEVERITY_META[s].label}
                  active={activeSeverity === s}
                  onClick={() => setActiveSeverity(s)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4">
        {visible.map((s) => (
          <TokenOptimizationCard key={s.id} suggestion={s} />
        ))}
      </div>
    </div>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
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
