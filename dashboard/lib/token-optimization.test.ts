import { describe, expect, it } from 'vitest'
import type { TokenOptCategory, TokenOptSeverity, TokenOptimizationSuggestion } from '@/lib/api'
import {
  TOKEN_OPT_CATEGORY_META,
  TOKEN_OPT_SEVERITY_META,
  TOKEN_OPT_SEVERITY_ORDER,
  formatSavings,
  formatTokenReduction,
  sortTokenOptSuggestions,
  tokenOptSeverityRank,
} from './token-optimization'

const ALL_CATEGORIES: TokenOptCategory[] = [
  'high_consumption',
  'model_optimization',
  'cache_opportunity',
  'retry_analysis',
  'cost_anomaly',
]
const ALL_SEVERITIES: TokenOptSeverity[] = ['critical', 'high', 'medium', 'low']

function suggestion(overrides: Partial<TokenOptimizationSuggestion> = {}): TokenOptimizationSuggestion {
  return {
    id: 's1',
    title: 'test',
    category: 'model_optimization',
    severity: 'medium',
    estimated_monthly_savings_usd: 10,
    estimated_token_reduction_pct: 0,
    confidence_score: 50,
    summary: '',
    why: '',
    recommended_action: '',
    current_state: {},
    recommended_state: {},
    affected: {},
    related_report_link: null,
    sample_size: 1,
    ...overrides,
  }
}

describe('TOKEN_OPT_CATEGORY_META / TOKEN_OPT_SEVERITY_META exhaustiveness', () => {
  it('has a meta entry for every category in the wire vocabulary', () => {
    for (const c of ALL_CATEGORIES) {
      expect(TOKEN_OPT_CATEGORY_META[c]).toBeDefined()
      expect(TOKEN_OPT_CATEGORY_META[c].label.length).toBeGreaterThan(0)
    }
  })

  it('has a meta entry for every severity in the wire vocabulary', () => {
    for (const s of ALL_SEVERITIES) {
      expect(TOKEN_OPT_SEVERITY_META[s]).toBeDefined()
      expect(TOKEN_OPT_SEVERITY_META[s].label.length).toBeGreaterThan(0)
    }
  })

  it('does not define "informational" — not part of this vocabulary', () => {
    expect((TOKEN_OPT_SEVERITY_META as Record<string, unknown>).informational).toBeUndefined()
  })
})

describe('tokenOptSeverityRank', () => {
  it('ranks critical before low', () => {
    expect(tokenOptSeverityRank('critical')).toBeLessThan(tokenOptSeverityRank('low'))
  })

  it('matches TOKEN_OPT_SEVERITY_ORDER', () => {
    TOKEN_OPT_SEVERITY_ORDER.forEach((s, i) => expect(tokenOptSeverityRank(s)).toBe(i))
  })
})

describe('sortTokenOptSuggestions', () => {
  it('sorts by severity first', () => {
    const list = [
      suggestion({ id: 'a', severity: 'low', estimated_monthly_savings_usd: 100 }),
      suggestion({ id: 'b', severity: 'critical', estimated_monthly_savings_usd: 1 }),
    ]
    const sorted = sortTokenOptSuggestions(list)
    expect(sorted.map((s) => s.id)).toEqual(['b', 'a'])
  })

  it('within the same severity, sorts by descending estimated savings (not confidence)', () => {
    const list = [
      suggestion({ id: 'a', severity: 'high', estimated_monthly_savings_usd: 5, confidence_score: 90 }),
      suggestion({ id: 'b', severity: 'high', estimated_monthly_savings_usd: 50, confidence_score: 10 }),
    ]
    const sorted = sortTokenOptSuggestions(list)
    expect(sorted.map((s) => s.id)).toEqual(['b', 'a'])
  })

  it('does not mutate the input array', () => {
    const list = [suggestion({ id: 'a', severity: 'low' }), suggestion({ id: 'b', severity: 'critical' })]
    const original = [...list]
    sortTokenOptSuggestions(list)
    expect(list).toEqual(original)
  })
})

describe('formatSavings', () => {
  it('formats a positive amount as $X.XX/mo', () => {
    expect(formatSavings(12.5)).toBe('$12.50/mo')
  })

  it('formats zero as $0.00/mo', () => {
    expect(formatSavings(0)).toBe('$0.00/mo')
  })

  it('never shows a negative amount', () => {
    expect(formatSavings(-5)).toBe('$0.00/mo')
  })
})

describe('formatTokenReduction', () => {
  it('formats a positive percentage', () => {
    expect(formatTokenReduction(42.7)).toBe('43%')
  })

  it('shows an em-dash for zero (not applicable to this suggestion type)', () => {
    expect(formatTokenReduction(0)).toBe('—')
  })
})
