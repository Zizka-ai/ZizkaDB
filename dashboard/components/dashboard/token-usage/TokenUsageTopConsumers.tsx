'use client'

import { useState } from 'react'
import { colors, radii } from '@/lib/design-tokens'
import { formatCost, formatTokens } from '@/lib/token-usage'
import type { TokenUsagePayload } from '@/lib/api'

type Dimension = 'model' | 'agent' | 'workflow' | 'tool' | 'user'

// Purely categorical — identifies which dimension a bar belongs to, no status
// meaning. Deliberately distinct from colors.warning/danger (reserved
// elsewhere for "needs attention"/"actual failures") so a Tool or Workflow
// bar is never misread as an alert.
const DIMENSION_OPTIONS: Array<{ value: Dimension; label: string; color: string }> = [
  { value: 'model', label: 'Model', color: colors.info },
  { value: 'agent', label: 'Agent', color: colors.success },
  { value: 'workflow', label: 'Workflow', color: '#f0abfc' },
  { value: 'tool', label: 'Tool', color: '#22d3ee' },
  { value: 'user', label: 'User', color: '#a78bfa' },
]

function Row({
  label,
  tokens,
  cost,
  requests,
  pctOfMax,
  color,
}: {
  label: string
  tokens: number
  cost: number
  requests: number
  pctOfMax: number
  color: string
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <span className="text-sm font-mono truncate" style={{ color: colors.text }} title={label}>
          {label}
        </span>
        <span className="text-xs font-mono shrink-0" style={{ color: colors.textMuted }}>
          {formatTokens(tokens)} tok · {formatCost(cost)} · {formatTokens(requests)} req
        </span>
      </div>
      <div className="h-2 rounded overflow-hidden" style={{ background: colors.bg }}>
        <div
          className="h-full rounded"
          style={{ width: `${Math.min(pctOfMax, 100)}%`, background: color }}
        />
      </div>
    </div>
  )
}

/**
 * Top-10 consumers for one dimension at a time (Model/Agent/Workflow/Tool/User,
 * switched by a single segmented control). One simple list, one column: each
 * row is a labeled bar with its numbers on the same line above it — nothing
 * split into side-by-side panels, so there's nothing for two independent
 * layouts to misalign. Replaces an earlier two-column bars+table layout that
 * was harder to scan and drifted out of alignment at in-between widths.
 * Returns null when the selected dimension has zero rows — the parent shows
 * an EmptyState in that case, per the existing convention.
 */
export function TokenUsageTopConsumers({ usage }: { usage: TokenUsagePayload }) {
  const [dimension, setDimension] = useState<Dimension>('model')
  const availableDimensions = DIMENSION_OPTIONS.filter((o) => usage.top_consumers[o.value].length > 0)
  const active = availableDimensions.find((o) => o.value === dimension) ?? availableDimensions[0]
  const activeDimension = active?.value ?? dimension
  const rows = usage.top_consumers[activeDimension]
  const maxTokens = Math.max(...rows.map((r) => r.tokens), 1)

  return (
    <div
      style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg }}
    >
      <div
        className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
        style={{ borderBottom: `1px solid ${colors.border}` }}
      >
        <h3 className="text-sm font-medium" style={{ color: colors.textStrong }}>
          Top consumers
        </h3>
        <div
          role="tablist"
          aria-label="Top consumers dimension"
          className="inline-flex items-center gap-0.5 p-0.5"
          style={{ background: colors.surfaceAlt, borderRadius: radii.md }}
        >
          {availableDimensions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={activeDimension === opt.value}
              onClick={() => setDimension(opt.value)}
              className="text-xs px-2.5 py-1 transition inline-flex items-center gap-1.5"
              style={{
                borderRadius: radii.sm,
                background: activeDimension === opt.value ? colors.surfaceHover : 'transparent',
                color: activeDimension === opt.value ? colors.textStrong : colors.textMuted,
              }}
            >
              <span
                style={{ width: 6, height: 6, borderRadius: radii.full, background: opt.color }}
                aria-hidden="true"
              />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm px-4 py-8 text-center" style={{ color: colors.textMuted }}>
          No {activeDimension} data in this period.
        </p>
      ) : (
        <div className="p-4 space-y-4">
          {rows.map((r) => (
            <Row
              key={r.key}
              label={r.key}
              tokens={r.tokens}
              cost={r.cost}
              requests={r.requests}
              pctOfMax={(r.tokens / maxTokens) * 100}
              color={active?.color ?? colors.info}
            />
          ))}
        </div>
      )}
    </div>
  )
}
