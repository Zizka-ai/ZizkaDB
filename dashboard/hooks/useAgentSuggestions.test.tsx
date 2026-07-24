import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { SuggestionsResult } from '@/lib/api'

const getAgentSuggestions = vi.fn()

vi.mock('@/lib/api', () => ({
  getAgentSuggestions: (...a: unknown[]) => getAgentSuggestions(...a),
}))
vi.mock('@/lib/auth', () => ({ getToken: () => 'tok' }))

import { useAgentSuggestions } from './useAgentSuggestions'

function result(status: SuggestionsResult['status'], count = 0): SuggestionsResult {
  return {
    agent: 'a1',
    status,
    period: { from: 'f', to: 't', days: 30 },
    model: 'claude-sonnet-4-6',
    generated_at: '2026-07-24T00:00:00Z',
    suggestions: Array.from({ length: count }, (_, i) => ({
      title: `s${i}`,
      category: 'general',
      severity: 'medium',
      confidence: 50,
      evidence: [],
      recommendation: 'r',
      expected_impact: '',
    })),
    evidence: [],
    meta: {},
  }
}

const RANGE = { from: 'f', to: 't' }

beforeEach(() => getAgentSuggestions.mockReset())

describe('useAgentSuggestions', () => {
  it('does not fetch without an agent or range', async () => {
    const { result: r } = renderHook(() => useAgentSuggestions(null, RANGE))
    await waitFor(() => expect(r.current.loading).toBe(false))
    expect(getAgentSuggestions).not.toHaveBeenCalled()
  })

  it('loads suggestions for an agent + range', async () => {
    getAgentSuggestions.mockResolvedValueOnce(result('ok', 2))
    const { result: r } = renderHook(() => useAgentSuggestions('a1', RANGE))
    await waitFor(() => expect(r.current.loading).toBe(false))
    expect(r.current.result?.suggestions).toHaveLength(2)
    // first load does not force refresh
    expect(getAgentSuggestions.mock.calls[0]?.[2]).toMatchObject({ refresh: false })
  })

  it('regenerate keeps the prior result visible and requests refresh', async () => {
    getAgentSuggestions.mockResolvedValueOnce(result('ok', 1))
    const { result: r } = renderHook(() => useAgentSuggestions('a1', RANGE))
    await waitFor(() => expect(r.current.loading).toBe(false))

    let release: (v: SuggestionsResult) => void = () => {}
    getAgentSuggestions.mockImplementationOnce(
      () => new Promise<SuggestionsResult>((res) => (release = res)),
    )
    act(() => r.current.refetch())
    await waitFor(() => expect(r.current.refreshing).toBe(true))
    // prior result stays on screen while refreshing
    expect(r.current.result?.suggestions).toHaveLength(1)
    expect(getAgentSuggestions.mock.calls.at(-1)?.[2]).toMatchObject({ refresh: true })

    await act(async () => {
      release(result('ok', 3))
    })
    await waitFor(() => expect(r.current.refreshing).toBe(false))
    expect(r.current.result?.suggestions).toHaveLength(3)
  })

  it('surfaces an error message on failure', async () => {
    getAgentSuggestions.mockRejectedValueOnce(new Error('AI provider unavailable'))
    const { result: r } = renderHook(() => useAgentSuggestions('a1', RANGE))
    await waitFor(() => expect(r.current.loading).toBe(false))
    expect(r.current.error).toMatch(/AI provider unavailable/)
  })
})
