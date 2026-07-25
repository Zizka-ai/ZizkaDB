import { describe, expect, it } from 'vitest'
import {
  CATEGORY_META,
  SEVERITY_META,
  SEVERITY_ORDER,
  confidenceColor,
  confidenceLabel,
  severityRank,
  sortSuggestions,
} from './suggestions'
import type { Suggestion } from './api'

function make(partial: Partial<Suggestion>): Suggestion {
  return {
    title: 't',
    category: 'general',
    severity: 'medium',
    confidence: 50,
    evidence: [],
    recommendation: 'r',
    expected_impact: '',
    ...partial,
  }
}

describe('severityRank', () => {
  it('orders critical < high < medium < low < informational', () => {
    const ranks = SEVERITY_ORDER.map(severityRank)
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
    expect(severityRank('critical')).toBeLessThan(severityRank('informational'))
  })
})

describe('sortSuggestions', () => {
  it('sorts by severity, then confidence desc', () => {
    const list = [
      make({ title: 'low', severity: 'low', confidence: 90 }),
      make({ title: 'crit', severity: 'critical', confidence: 40 }),
      make({ title: 'med-hi', severity: 'medium', confidence: 80 }),
      make({ title: 'med-lo', severity: 'medium', confidence: 60 }),
    ]
    expect(sortSuggestions(list).map((s) => s.title)).toEqual(['crit', 'med-hi', 'med-lo', 'low'])
  })

  it('does not mutate the input', () => {
    const list = [make({ severity: 'low' }), make({ severity: 'critical' })]
    const before = [...list]
    sortSuggestions(list)
    expect(list).toEqual(before)
  })
})

describe('meta lookups', () => {
  it('has meta for every severity and category', () => {
    for (const s of SEVERITY_ORDER) expect(SEVERITY_META[s].label).toBeTruthy()
    for (const c of ['general', 'token_optimization', 'error_prevention', 'performance', 'reliability', 'code'] as const) {
      expect(CATEGORY_META[c].label).toBeTruthy()
      expect(CATEGORY_META[c].icon).toBeTruthy()
    }
  })
})

describe('confidence formatting', () => {
  it('rounds the label', () => {
    expect(confidenceLabel(72.6)).toBe('73% confidence')
  })
  it('colors high confidence differently from low', () => {
    expect(confidenceColor(90)).not.toBe(confidenceColor(20))
  })
})
