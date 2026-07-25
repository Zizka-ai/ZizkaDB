'use client'

import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui'
import { Select } from '@/components/ui/Select'
import { colors, radii } from '@/lib/design-tokens'
import { PERIOD_OPTIONS, type PeriodType, validateCustomRange } from '@/lib/report'

/**
 * Suggestions controls: analysis period, custom date range (Custom only) and a
 * Regenerate action (bypasses the server cache). Mirrors ReportToolbar so the
 * two agent-scoped tabs feel identical.
 */
export function SuggestionsToolbar({
  period,
  onPeriodChange,
  custom,
  onCustomChange,
  onGenerateCustom,
  onRegenerate,
  canRegenerate,
  refreshing,
}: {
  period: PeriodType
  onPeriodChange: (p: PeriodType) => void
  custom: { from: string; to: string }
  onCustomChange: (c: { from: string; to: string }) => void
  onGenerateCustom: () => void
  onRegenerate: () => void
  canRegenerate: boolean
  refreshing: boolean
}) {
  const customError = period === 'custom' ? validateCustomRange(custom.from, custom.to) : null

  return (
    <div className="flex flex-wrap items-end gap-3 mb-5">
      <div>
        <label className="block text-xs mb-1" style={{ color: colors.textFaint }}>
          Analysis period
        </label>
        <Select
          options={PERIOD_OPTIONS}
          value={period}
          onChange={(v) => onPeriodChange(v as PeriodType)}
          ariaLabel="Analysis period"
          minWidth={210}
        />
      </div>

      {period === 'custom' && (
        <>
          <DateField
            label="From"
            value={custom.from}
            onChange={(v) => onCustomChange({ ...custom, from: v })}
          />
          <DateField
            label="To"
            value={custom.to}
            onChange={(v) => onCustomChange({ ...custom, to: v })}
          />
          <Button onClick={onGenerateCustom} tone="primary" disabled={!!customError}>
            Analyze
          </Button>
          {customError && (
            <span className="text-xs w-full sm:w-auto" style={{ color: colors.danger }}>
              {customError}
            </span>
          )}
        </>
      )}

      <div className="flex items-center gap-2 ml-auto">
        <Button onClick={onRegenerate} disabled={!canRegenerate || refreshing}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Regenerate
        </Button>
      </div>
    </div>
  )
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs mb-1" style={{ color: colors.textFaint }}>
        {label}
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 text-sm outline-none"
        style={{
          background: colors.surface,
          border: `1px solid ${colors.borderStrong}`,
          borderRadius: radii.md,
          color: colors.text,
          colorScheme: 'dark',
        }}
      />
    </div>
  )
}
