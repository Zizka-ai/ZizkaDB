'use client'

import { radii } from '@/lib/design-tokens'
import { SEVERITY_META, type SeverityMeta } from '@/lib/suggestions'
import type { SuggestionSeverity } from '@/lib/api'

/**
 * Severity as dot + label — never colour alone (accessibility).
 *
 * Generalized to accept an explicit `meta` lookup so it's reusable by any
 * severity vocabulary, not just AI Suggestions' `SuggestionSeverity` — e.g.
 * Token Optimization's `TokenOptSeverity` (a different, non-overlapping enum
 * with its own `TOKEN_OPT_SEVERITY_META` in lib/token-optimization.ts).
 * `severity` defaults to the AI-suggestions lookup so every existing call
 * site (which only ever passed `severity`) keeps working unchanged.
 */
export function SeverityBadge({
  severity,
  meta,
}: {
  severity: SuggestionSeverity | string
  meta?: SeverityMeta
}) {
  const resolved = meta ?? SEVERITY_META[severity as SuggestionSeverity]
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 shrink-0"
      style={{ background: resolved.bg, color: resolved.fg, borderRadius: radii.sm }}
    >
      <span
        aria-hidden="true"
        style={{ width: 6, height: 6, borderRadius: radii.full, background: resolved.fg }}
      />
      {resolved.label}
    </span>
  )
}
