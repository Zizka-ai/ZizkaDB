import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { AgentEvent } from '@/lib/api'

const getEvents = vi.fn()

vi.mock('@/lib/api', () => ({
  getEvents: (...a: unknown[]) => getEvents(...a),
  searchEvents: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ getToken: () => 'tok' }))

vi.mock('@/lib/constants', () => ({ POLL_INTERVAL_MS: 10_000 }))

import { useAgentEvents } from './useAgentEvents'

function ev(id: string): AgentEvent {
  return {
    event_id: id,
    agent: 'a1',
    timestamp: '2026-01-01T00:00:00Z',
    event: 'action',
    data: {},
    parent_id: null,
    session_id: null,
    sequence_no: 1,
  } as AgentEvent
}

describe('useAgentEvents polling', () => {
  beforeEach(() => {
    getEvents.mockReset()
    getEvents.mockResolvedValue([ev('a')])
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not poll events while the tab is hidden', async () => {
    const { result } = renderHook(() => useAgentEvents('a1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(getEvents).toHaveBeenCalledTimes(1)

    vi.useFakeTimers()
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    })
    await act(async () => {
      vi.advanceTimersByTime(10_000)
    })
    expect(getEvents).toHaveBeenCalledTimes(1)
  })
})
