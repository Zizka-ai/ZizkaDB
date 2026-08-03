'use client'

import { useState } from 'react'
import { colors, radii } from '@/lib/design-tokens'
import { formatCost, formatTokens } from '@/lib/token-usage'
import type { TokenUsagePayload } from '@/lib/api'

type Dimension = 'model' | 'agent' | 'tool' | 'user'

const DIMENSION_OPTIONS: Array<{ value: Dimension; label: string }> = [
  { value: 'model', label: 'Model' },
  { value: 'agent', label: 'Agent' },
  { value: 'tool', label: 'Tool' },
  { value: 'user', label: 'User' },
]

/**
 * Top-10 consumers table, adapted from report/SessionsTable's bordered card +
 * right-aligned numeric columns + horizontal-scroll idiom. A small segmented
 * control switches which dimension is ranked (default Model). Returns null
 * when the selected dimension has zero rows — the parent shows an EmptyState
 * in that case, per the existing convention (mirrors SessionsTable returning
 * null on an empty sessions list).
 */
export function TokenUsageTopConsumers({ usage }: { usage: TokenUsagePayload }) {
  const [dimension, setDimension] = useState<Dimension>('model')
  const rows = usage.top_consumers[dimension]

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
          {DIMENSION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={dimension === opt.value}
              onClick={() => setDimension(opt.value)}
              className="text-xs px-2.5 py-1 transition"
              style={{
                borderRadius: radii.sm,
                background: dimension === opt.value ? colors.surfaceHover : 'transparent',
                color: dimension === opt.value ? colors.textStrong : colors.textMuted,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm px-4 py-8 text-center" style={{ color: colors.textMuted }}>
          No {dimension} data in this period.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 480 }}>
            <thead>
              <tr>
                {[
                  DIMENSION_OPTIONS.find((o) => o.value === dimension)?.label ?? 'Key',
                  'Tokens',
                  'Cost',
                  'Requests',
                ].map((h, i) => (
                  <th
                    key={h}
                    scope="col"
                    className={`px-4 py-2 text-xs font-medium ${i === 0 ? 'text-left' : 'text-right'}`}
                    style={{ color: colors.textFaint }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="row-hover" style={{ borderTop: `1px solid ${colors.border}` }}>
                  <td
                    className="px-4 py-2 font-mono truncate"
                    style={{ color: colors.text, maxWidth: 220 }}
                    title={r.key}
                  >
                    {r.key}
                  </td>
                  <td className="px-4 py-2 text-right font-mono" style={{ color: colors.text }}>
                    {formatTokens(r.tokens)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono" style={{ color: colors.textMuted }}>
                    {formatCost(r.cost)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono" style={{ color: colors.textMuted }}>
                    {formatTokens(r.requests)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
