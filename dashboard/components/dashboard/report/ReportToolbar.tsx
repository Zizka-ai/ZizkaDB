'use client'

import { Download, Printer, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui'
import { Select } from '@/components/ui/Select'
import { colors, radii } from '@/lib/design-tokens'
import { PERIOD_OPTIONS, type PeriodType, validateCustomRange } from '@/lib/report'

/**
 * Report controls: period picker, custom date range (only for Custom), and the
 * Regenerate / Print / Download-PDF actions. Print & Download are disabled
 * until a report is available so a skeleton is never printed.
 */
export function ReportToolbar({
  period,
  onPeriodChange,
  custom,
  onCustomChange,
  onGenerateCustom,
  onRegenerate,
  onPrint,
  canExport,
  refreshing,
}: {
  period: PeriodType
  onPeriodChange: (p: PeriodType) => void
  custom: { from: string; to: string }
  onCustomChange: (c: { from: string; to: string }) => void
  onGenerateCustom: () => void
  onRegenerate: () => void
  onPrint: () => void
  canExport: boolean
  refreshing: boolean
}) {
  const customError = period === 'custom' ? validateCustomRange(custom.from, custom.to) : null

  return (
    <div className="report-toolbar flex flex-wrap items-end gap-3 mb-5">
      <div>
        <label className="block text-xs mb-1" style={{ color: colors.textFaint }}>
          Report period
        </label>
        <Select
          options={PERIOD_OPTIONS}
          value={period}
          onChange={(v) => onPeriodChange(v as PeriodType)}
          ariaLabel="Report period"
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
            Generate
          </Button>
          {customError && (
            <span className="text-xs w-full sm:w-auto" style={{ color: colors.danger }}>
              {customError}
            </span>
          )}
        </>
      )}

      <div className="flex items-center gap-2 ml-auto">
        <Button onClick={onRegenerate} disabled={!canExport || refreshing}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Regenerate
        </Button>
        <Button onClick={onPrint} disabled={!canExport}>
          <Printer size={14} />
          Print
        </Button>
        <Button onClick={onPrint} tone="primary" disabled={!canExport}>
          <Download size={14} />
          Download PDF
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
