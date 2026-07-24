'use client'

import { radii } from '@/lib/design-tokens'
import { SEVERITY_META } from '@/lib/suggestions'
import type { SuggestionSeverity } from '@/lib/api'

/** Severity as dot + label — never colour alone (accessibility). */
export function SeverityBadge({ severity }: { severity: SuggestionSeverity }) {
  const meta = SEVERITY_META[severity]
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 shrink-0"
      style={{ background: meta.bg, color: meta.fg, borderRadius: radii.sm }}
    >
      <span
        aria-hidden="true"
        style={{ width: 6, height: 6, borderRadius: radii.full, background: meta.fg }}
      />
      {meta.label}
    </span>
  )
}
