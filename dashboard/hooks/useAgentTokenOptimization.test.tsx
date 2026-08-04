import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { TokenOptimizationResult } from '@/lib/api'

const getAgentTokenOptimization = vi.fn()

vi.mock('@/lib/api', () => ({
  getAgentTokenOptimization: (...a: unknown[]) => getAgentTokenOptimization(...a),
}))
vi.mock('@/lib/auth', () => ({ getToken: () => 'tok' }))

import { useAgentTokenOptimization } from './useAgentTokenOptimization'

function result(status: TokenOptimizationResult['status'], count = 0): TokenOptimizationResult {
  return {
    agent: 'a1',
    status,
    period: { from: 'f', to: 't', granularity: 'day' },
    generated_at: '2026-07-24T00:00:00Z',
    suggestions: Array.from({ length: count }, (_, i) => ({
      id: `s${i}`,
      title: `s${i}`,
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
    })),
    aggregates: {
      total_potential_monthly_savings_usd: 10 * count,
      potential_token_reduction_pct: 0,
      cost_reduction_pct: 0,
      optimization_score: 90,
      suggestion_count: count,
      critical_count: 0,
    },
    unpriced_models: [],
    meta: {},
  }
}

const RANGE = { from: 'f', to: 't', granularity: 'day' as const }

beforeEach(() => getAgentTokenOptimization.mockReset())

describe('useAgentTokenOptimization', () => {
  it('does not fetch without an agent or range', async () => {
    const { result: r } = renderHook(() => useAgentTokenOptimization(null, RANGE))
    await waitFor(() => expect(r.current.loading).toBe(false))
    expect(getAgentTokenOptimization).not.toHaveBeenCalled()
  })

  it('loads suggestions for an agent + range', async () => {
    getAgentTokenOptimization.mockResolvedValueOnce(result('ok', 2))
    const { result: r } = renderHook(() => useAgentTokenOptimization('a1', RANGE))
    await waitFor(() => expect(r.current.loading).toBe(false))
    expect(r.current.result?.suggestions).toHaveLength(2)
  })

  it('regenerate keeps the prior result visible while refreshing', async () => {
    getAgentTokenOptimization.mockResolvedValueOnce(result('ok', 1))
    const { result: r } = renderHook(() => useAgentTokenOptimization('a1', RANGE))
    await waitFor(() => expect(r.current.loading).toBe(false))

    let release: (v: TokenOptimizationResult) => void = () => {}
    getAgentTokenOptimization.mockImplementationOnce(
      () => new Promise<TokenOptimizationResult>((res) => (release = res)),
    )
    act(() => r.current.refetch())
    await waitFor(() => expect(r.current.refreshing).toBe(true))
    // prior result stays on screen while refreshing
    expect(r.current.result?.suggestions).toHaveLength(1)

    await act(async () => {
      release(result('ok', 3))
    })
    await waitFor(() => expect(r.current.refreshing).toBe(false))
    expect(r.current.result?.suggestions).toHaveLength(3)
  })

  it('rejects a stale response when the range changes mid-flight', async () => {
    let releaseFirst: (v: TokenOptimizationResult) => void = () => {}
    getAgentTokenOptimization.mockImplementationOnce(
      () => new Promise<TokenOptimizationResult>((res) => (releaseFirst = res)),
    )
    const { result: r, rerender } = renderHook(
      ({ range }) => useAgentTokenOptimization('a1', range),
      { initialProps: { range: RANGE } },
    )

    const secondRange = { from: 'f2', to: 't2', granularity: 'day' as const }
    getAgentTokenOptimization.mockResolvedValueOnce(result('ok', 5))
    rerender({ range: secondRange })
    await waitFor(() => expect(r.current.loading).toBe(false))
    expect(r.current.result?.suggestions).toHaveLength(5)

    // The first (stale) request resolves after the second — must not overwrite.
    await act(async () => {
      releaseFirst(result('ok', 1))
    })
    expect(r.current.result?.suggestions).toHaveLength(5)
  })

  it('surfaces an error message on failure', async () => {
    getAgentTokenOptimization.mockRejectedValueOnce(new Error('boom'))
    const { result: r } = renderHook(() => useAgentTokenOptimization('a1', RANGE))
    await waitFor(() => expect(r.current.loading).toBe(false))
    expect(r.current.error).toMatch(/boom/)
  })
})
