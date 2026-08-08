import { describe, expect, it } from 'vitest'
import { formatCost, formatTokens, hasAnyData } from './token-usage'
import type { TokenUsagePayload } from '@/lib/api'

function makePayload(totalRequests: number): TokenUsagePayload {
  return {
    agent: 'agent-a',
    generated_at: '2026-07-01T00:00:00+00:00',
    period: { from: '2026-06-01T00:00:00+00:00', to: '2026-07-01T00:00:00+00:00', granularity: 'day' },
    totals: {
      total_requests: totalRequests,
      success_count: totalRequests,
      failed_count: 0,
      success_rate_pct: totalRequests ? 100 : 0,
      total_tokens: 0,
      input_tokens: 0,
      output_tokens: 0,
      cached_tokens: 0,
      reasoning_tokens: 0,
      avg_tokens_per_request: 0,
      total_cost: 0,
    },
    unpriced_models: [],
    breakdown: { model: [], agent: [], workflow: [], tool: [], user: [] },
    trend: [],
    top_consumers: { model: [], agent: [], workflow: [], tool: [], user: [] },
  }
}

describe('hasAnyData', () => {
  it('false when there are zero requests', () => {
    expect(hasAnyData(makePayload(0))).toBe(false)
  })
  it('true when there is at least one request', () => {
    expect(hasAnyData(makePayload(1))).toBe(true)
  })
})

describe('formatCost', () => {
  it('formats a normal dollar amount', () => {
    expect(formatCost(1.5)).toBe('$1.50')
  })
  it('keeps sub-cent precision instead of rounding to $0.00', () => {
    expect(formatCost(0.0034)).toBe('$0.0034')
  })
  it('formats zero', () => {
    expect(formatCost(0)).toBe('$0.00')
  })
})

describe('formatTokens', () => {
  it('adds thousands separators and rounds', () => {
    expect(formatTokens(1234567)).toBe('1,234,567')
    expect(formatTokens(12.6)).toBe('13')
  })
})
