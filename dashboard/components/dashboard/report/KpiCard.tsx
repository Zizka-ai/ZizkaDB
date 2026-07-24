'use client'

import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { colors, radii } from '@/lib/design-tokens'
import { computeDelta } from '@/lib/report'

/**
 * One KPI tile with an optional period-over-period delta.
 *
 * `goodDirection` decides delta color by *meaning*, not by sign: a falling
 * error rate (`goodDirection="down"`) is GREEN, a rising one is RED. When there
 * is no previous value the delta shows a neutral "New" badge (never Infinity%).
 */
export function KpiCard({
  label,
  value,
  current,
  previous,
  goodDirection = 'neutral',
  footnote,
}: {
  label: string
  value: string
  current?: number
  previous?: number
  goodDirection?: 'up' | 'down' | 'neutral'
  footnote?: string
}) {
  const delta =
    current !== undefined && previous !== undefined ? computeDelta(current, previous) : null

  let deltaEl: React.ReactNode = null
  if (delta) {
    if (delta.kind === 'new') {
      deltaEl = (
        <span className="text-xs" style={{ color: colors.textMuted }}>
          New
        </span>
      )
    } else if (delta.kind === 'flat') {
      deltaEl = (
        <span className="inline-flex items-center gap-0.5 text-xs" style={{ color: colors.textFaint }}>
          <Minus size={11} /> 0%
        </span>
      )
    } else {
      const rising = delta.pct > 0
      const isGood =
        goodDirection === 'neutral'
          ? null
          : (goodDirection === 'up' && rising) || (goodDirection === 'down' && !rising)
      const color = isGood === null ? colors.textMuted : isGood ? colors.success : colors.danger
      const Icon = rising ? ArrowUpRight : ArrowDownRight
      deltaEl = (
        <span className="inline-flex items-center gap-0.5 text-xs" style={{ color }}>
          <Icon size={12} />
          {Math.abs(Math.round(delta.pct))}%
        </span>
      )
    }
  }

  return (
    <div
      className="p-4"
      style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg }}
    >
      <div className="text-xs" style={{ color: colors.textFaint }}>
        {label}
      </div>
      <div className="flex items-baseline justify-between gap-2 mt-1">
        <span className="text-2xl font-semibold font-mono" style={{ color: colors.textStrong }}>
          {value}
        </span>
        {deltaEl}
      </div>
      {footnote && (
        <div className="text-xs mt-1" style={{ color: colors.textFaint }}>
          {footnote}
        </div>
      )}
    </div>
  )
}
