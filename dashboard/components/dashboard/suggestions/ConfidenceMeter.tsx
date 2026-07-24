'use client'

import { colors, radii } from '@/lib/design-tokens'
import { confidenceColor, confidenceLabel } from '@/lib/suggestions'

/** Compact confidence indicator: a bar + "N% confidence". */
export function ConfidenceMeter({ confidence }: { confidence: number }) {
  const pct = Math.max(0, Math.min(100, confidence))
  return (
    <div className="flex items-center gap-2" title={confidenceLabel(pct)}>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ width: 56, background: colors.bg }}
        role="img"
        aria-label={confidenceLabel(pct)}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: confidenceColor(pct) }}
        />
      </div>
      <span className="text-xs font-mono shrink-0" style={{ color: colors.textMuted }}>
        {Math.round(pct)}%
      </span>
    </div>
  )
}
