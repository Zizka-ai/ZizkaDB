import { describe, expect, it } from 'vitest'
import {
  computeDelta,
  formatDuration,
  formatNumber,
  granularityForSpan,
  isPeriodType,
  resolveRange,
  resolveTokenUsageRange,
  tokenUsageGranularityForSpan,
  validateCustomRange,
} from './report'

const NOW = new Date('2026-07-24T12:00:00Z')
const DAY = 24 * 60 * 60 * 1000

describe('resolveRange', () => {
  it('weekly = last 7 days, day granularity', () => {
    const r = resolveRange('weekly', undefined, NOW)
    expect(r.to).toBe(NOW.toISOString())
    expect(r.from).toBe(new Date(NOW.getTime() - 7 * DAY).toISOString())
    expect(r.granularity).toBe('day')
  })

  it('yearly = last 365 days, week granularity', () => {
    const r = resolveRange('yearly', undefined, NOW)
    expect(r.from).toBe(new Date(NOW.getTime() - 365 * DAY).toISOString())
    expect(r.granularity).toBe('week')
  })

  it('custom uses provided from/to', () => {
    const r = resolveRange('custom', { from: '2026-06-01', to: '2026-06-15' }, NOW)
    expect(r.from).toBe(new Date('2026-06-01').toISOString())
    expect(r.to).toBe(new Date('2026-06-15').toISOString())
    expect(r.granularity).toBe('day')
  })
})

describe('granularityForSpan', () => {
  it('day at/below 92 days, week above', () => {
    expect(granularityForSpan(0, 92 * DAY)).toBe('day')
    expect(granularityForSpan(0, 93 * DAY)).toBe('week')
  })
})

describe('validateCustomRange', () => {
  it('rejects missing, inverted, over-long; accepts valid', () => {
    expect(validateCustomRange(undefined, '2026-01-02')).toMatch(/both/i)
    expect(validateCustomRange('2026-02-01', '2026-01-01')).toMatch(/before/i)
    expect(validateCustomRange('2024-01-01', '2026-01-01')).toMatch(/366/)
    expect(validateCustomRange('bad', '2026-01-01')).toMatch(/valid/i)
    expect(validateCustomRange('2026-01-01', '2026-01-08')).toBeNull()
  })
})

describe('isPeriodType', () => {
  it('guards known values', () => {
    expect(isPeriodType('weekly')).toBe(true)
    expect(isPeriodType('custom')).toBe(true)
    expect(isPeriodType('daily')).toBe(true)
    expect(isPeriodType('semiannual')).toBe(true)
    expect(isPeriodType('nope')).toBe(false)
    expect(isPeriodType(null)).toBe(false)
  })
})

describe('daily/semiannual presets (additive, token usage)', () => {
  it('daily = last 24h', () => {
    const r = resolveRange('daily', undefined, NOW)
    expect(r.from).toBe(new Date(NOW.getTime() - DAY).toISOString())
    expect(r.granularity).toBe('day') // ReportGranularity has no 'hour'
  })

  it('semiannual = last ~182 days, week granularity', () => {
    const r = resolveRange('semiannual', undefined, NOW)
    expect(r.from).toBe(new Date(NOW.getTime() - 182 * DAY).toISOString())
    expect(r.granularity).toBe('week')
  })

  it('existing weekly/monthly/quarterly/yearly/custom callers are unaffected', () => {
    expect(resolveRange('monthly', undefined, NOW).granularity).toBe('day')
    expect(resolveRange('quarterly', undefined, NOW).granularity).toBe('day')
  })
})

describe('tokenUsageGranularityForSpan', () => {
  it('hour for spans <= 2 days', () => {
    expect(tokenUsageGranularityForSpan(0, DAY)).toBe('hour')
    expect(tokenUsageGranularityForSpan(0, 2 * DAY)).toBe('hour')
  })
  it('falls back to day/week beyond 2 days', () => {
    expect(tokenUsageGranularityForSpan(0, 30 * DAY)).toBe('day')
    expect(tokenUsageGranularityForSpan(0, 200 * DAY)).toBe('week')
  })
})

describe('resolveTokenUsageRange', () => {
  it('daily preset resolves to hour granularity', () => {
    const r = resolveTokenUsageRange('daily', undefined, NOW)
    expect(r.granularity).toBe('hour')
  })
  it('semiannual preset resolves to week granularity', () => {
    const r = resolveTokenUsageRange('semiannual', undefined, NOW)
    expect(r.granularity).toBe('week')
  })
})

describe('computeDelta', () => {
  it('previous 0 with growth is "new", never Infinity', () => {
    expect(computeDelta(10, 0)).toEqual({ kind: 'new', pct: 0 })
  })
  it('both 0 is flat', () => {
    expect(computeDelta(0, 0)).toEqual({ kind: 'flat', pct: 0 })
  })
  it('increase and decrease are signed', () => {
    expect(computeDelta(150, 100).pct).toBeCloseTo(50)
    expect(computeDelta(50, 100).pct).toBeCloseTo(-50)
  })
  it('negligible change reads as flat', () => {
    expect(computeDelta(1000, 1000).kind).toBe('flat')
  })
})

describe('formatDuration', () => {
  it('formats s / m / h', () => {
    expect(formatDuration(0)).toBe('0s')
    expect(formatDuration(45)).toBe('45s')
    expect(formatDuration(200)).toBe('3m 20s')
    expect(formatDuration(7500)).toBe('2h 5m')
  })
})

describe('formatNumber', () => {
  it('adds thousands separators', () => {
    expect(formatNumber(1234567)).toBe('1,234,567')
  })
})
