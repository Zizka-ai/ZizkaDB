'use client'

import { colors, radii } from '@/lib/design-tokens'
import { formatCost, formatTokens } from '@/lib/token-usage'
import type { TokenUsagePayload, TokenUsageBreakdown as Breakdown } from '@/lib/api'

const DIMENSIONS: Array<{ key: keyof TokenUsagePayload['breakdown']; label: string }> = [
  { key: 'model', label: 'By model' },
  { key: 'agent', label: 'By agent' },
  { key: 'workflow', label: 'By workflow' },
  { key: 'tool', label: 'By tool' },
  { key: 'user', label: 'By user' },
]

function Row({ row, maxTokens }: { row: Breakdown[number]; maxTokens: number }) {
  const pct = maxTokens > 0 ? (row.tokens / maxTokens) * 100 : 0
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <span className="text-xs font-mono truncate" style={{ color: colors.text }} title={row.key}>
          {row.key}
        </span>
        <span className="text-xs font-mono shrink-0 flex items-center gap-2" style={{ color: colors.textMuted }}>
          <span>{formatTokens(row.tokens)} tok</span>
          <span>{formatCost(row.cost)}</span>
          <span>{formatTokens(row.requests)} req</span>
        </span>
      </div>
      <div className="h-1.5 rounded overflow-hidden" style={{ background: colors.bg }}>
        <div
          className="h-full rounded"
          style={{ width: `${Math.min(pct, 100)}%`, background: colors.info, opacity: 0.8 }}
        />
      </div>
    </div>
  )
}

/**
 * One labeled section per dimension (Model / Agent / Workflow / Tool / User),
 * each sorted descending by tokens. A dimension only renders when at least
 * one row has real data for it (e.g. a tenant that never sets `data.workflow`
 * won't see an empty "By Workflow" section) — the hidden dimensions are
 * surfaced via a single collapsed note so their absence isn't a silent gap.
 */
export function TokenUsageBreakdown({ usage }: { usage: TokenUsagePayload }) {
  const sections = DIMENSIONS.map((d) => ({ ...d, rows: usage.breakdown[d.key] })).filter(
    (d) => d.rows.length > 0,
  )
  const hidden = DIMENSIONS.filter((d) => usage.breakdown[d.key].length === 0)

  if (sections.length === 0) {
    return (
      <div
        className="p-4"
        style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg }}
      >
        <h3 className="text-sm font-medium mb-2" style={{ color: colors.textStrong }}>
          Token usage breakdown
        </h3>
        <p className="text-sm" style={{ color: colors.textMuted }}>
          No token usage data in this period.
        </p>
      </div>
    )
  }

  return (
    <div
      className="p-4"
      style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg }}
    >
      <h3 className="text-sm font-medium mb-3" style={{ color: colors.textStrong }}>
        Token usage breakdown
      </h3>
      <div className="space-y-5">
        {sections.map((s) => {
          const maxTokens = Math.max(...s.rows.map((r) => r.tokens), 1)
          return (
            <div key={s.key}>
              <h4 className="text-xs font-medium mb-2" style={{ color: colors.textMuted }}>
                {s.label}
              </h4>
              <div className="space-y-2">
                {s.rows.map((row) => (
                  <Row key={row.key} row={row} maxTokens={maxTokens} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
      {hidden.length > 0 && (
        <p className="text-xs mt-4" style={{ color: colors.textFaint }}>
          {hidden.length} dimension{hidden.length > 1 ? 's' : ''} not shown — no events set{' '}
          {hidden.map((d) => d.label.replace('By ', '')).join(', ')} in this period.
        </p>
      )}
    </div>
  )
}
