import type { ReportGranularity } from '@/lib/api'

/**
 * Report period presets and pure formatting helpers.
 *
 * Periods are unambiguous **rolling** windows ending "now" (last N days), so a
 * shared report never depends on "which month". `custom` carries an explicit
 * from/to. Everything here is pure and unit-tested.
 */

export type PeriodType = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'

export interface PeriodOption {
  value: PeriodType
  label: string
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { value: 'weekly', label: 'Weekly (last 7 days)' },
  { value: 'monthly', label: 'Monthly (last 30 days)' },
  { value: 'quarterly', label: 'Quarterly (last 90 days)' },
  { value: 'yearly', label: 'Yearly (last 12 months)' },
  { value: 'custom', label: 'Custom range' },
]

const ROLLING_DAYS: Record<Exclude<PeriodType, 'custom'>, number> = {
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  yearly: 365,
}

export interface ResolvedRange {
  from: string // ISO
  to: string // ISO
  granularity: ReportGranularity
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Bucket size that keeps the series readable (mirrors the backend). */
export function granularityForSpan(fromMs: number, toMs: number): ReportGranularity {
  return (toMs - fromMs) / DAY_MS <= 92 ? 'day' : 'week'
}

export function isPeriodType(v: string | null | undefined): v is PeriodType {
  return v === 'weekly' || v === 'monthly' || v === 'quarterly' || v === 'yearly' || v === 'custom'
}

/**
 * Resolve a period (+ optional custom from/to) to a concrete ISO range.
 * `now` is injectable for deterministic tests.
 */
export function resolveRange(
  period: PeriodType,
  custom?: { from?: string; to?: string },
  now: Date = new Date(),
): ResolvedRange {
  if (period === 'custom') {
    // Caller is responsible for having validated custom (see validateCustomRange).
    const from = custom?.from ? new Date(custom.from) : new Date(now.getTime() - 30 * DAY_MS)
    const to = custom?.to ? new Date(custom.to) : now
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      granularity: granularityForSpan(from.getTime(), to.getTime()),
    }
  }
  const to = now
  const from = new Date(now.getTime() - ROLLING_DAYS[period] * DAY_MS)
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    granularity: granularityForSpan(from.getTime(), to.getTime()),
  }
}

/** Validate a custom range; returns an error message or null. Bounds mirror the API. */
export function validateCustomRange(fromStr?: string, toStr?: string): string | null {
  if (!fromStr || !toStr) return 'Pick both a start and end date.'
  const from = new Date(fromStr)
  const to = new Date(toStr)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 'Enter valid dates.'
  if (from >= to) return 'Start must be before end.'
  if ((to.getTime() - from.getTime()) / DAY_MS > 366) return 'Range is limited to 366 days.'
  return null
}

// ── Formatting ──────────────────────────────────────────────────────────────

const NUM = new Intl.NumberFormat('en-US')

export function formatNumber(n: number): string {
  return NUM.format(n)
}

// Report timestamps are UTC; format them in UTC so a shared report reads the
// same everywhere (date-fns `format` would use the viewer's local timezone).
const UTC_DATE = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric',
})
const UTC_DATETIME = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: false,
})
const UTC_MONTH_DAY = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC', month: 'short', day: 'numeric',
})
const UTC_MONTH_DAY_TIME = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
})

export const formatUtcDate = (iso: string) => UTC_DATE.format(new Date(iso))
export const formatUtcDateTime = (iso: string) => UTC_DATETIME.format(new Date(iso))
export const formatUtcMonthDay = (iso: string) => UTC_MONTH_DAY.format(new Date(iso))
export const formatUtcMonthDayTime = (iso: string) => UTC_MONTH_DAY_TIME.format(new Date(iso))
/** Calendar day of a UTC ISO timestamp, e.g. "2026-07-01". */
export const utcDay = (iso: string) => iso.slice(0, 10)

/** Human duration from seconds: "45s", "3m 20s", "2h 5m". */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0s'
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export interface Delta {
  kind: 'new' | 'flat' | 'change'
  pct: number // signed; 0 for new/flat
}

/**
 * Percentage change of `current` vs `previous`.
 * `previous === 0 && current > 0` → `new` (never Infinity); equal → `flat`.
 */
export function computeDelta(current: number, previous: number): Delta {
  if (previous === 0) return current > 0 ? { kind: 'new', pct: 0 } : { kind: 'flat', pct: 0 }
  const pct = ((current - previous) / previous) * 100
  if (Math.round(pct * 10) === 0) return { kind: 'flat', pct: 0 }
  return { kind: 'change', pct }
}
