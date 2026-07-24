import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { AgentEvent } from '@/lib/api'

const getEvents = vi.fn()
const searchEvents = vi.fn()

vi.mock('@/lib/api', () => ({
  getEvents: (...a: unknown[]) => getEvents(...a),
  searchEvents: (...a: unknown[]) => searchEvents(...a),
}))

vi.mock('@/lib/auth', () => ({ getToken: () => 'tok' }))

// Keep the poll from firing during assertions.
vi.mock('@/lib/constants', () => ({ POLL_INTERVAL_MS: 1_000_000 }))

import { useAgentEvents, PAGE_SIZE } from './useAgentEvents'

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

/** A full page signals "there may be more". */
function fullPage(prefix: string): AgentEvent[] {
  return Array.from({ length: PAGE_SIZE }, (_, i) => ev(`${prefix}-${i}`))
}

beforeEach(() => {
  getEvents.mockReset()
  searchEvents.mockReset()
})

describe('useAgentEvents', () => {
  it('does not fetch when there is no agent', async () => {
    const { result } = renderHook(() => useAgentEvents(null))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(getEvents).not.toHaveBeenCalled()
    expect(result.current.events).toEqual([])
  })

  it('sets hasMore only when a full page comes back', async () => {
    getEvents.mockResolvedValueOnce(fullPage('a'))
    const { result } = renderHook(() => useAgentEvents('a1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.hasMore).toBe(true)

    getEvents.mockReset()
    getEvents.mockResolvedValueOnce([ev('x')])
    const { result: partial } = renderHook(() => useAgentEvents('a2'))
    await waitFor(() => expect(partial.current.loading).toBe(false))
    expect(partial.current.hasMore).toBe(false)
  })

  it('appends on loadMore rather than replacing', async () => {
    getEvents.mockResolvedValueOnce(fullPage('a'))
    const { result } = renderHook(() => useAgentEvents('a1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    getEvents.mockResolvedValueOnce([ev('second-page')])
    await act(async () => {
      await result.current.loadMore()
    })

    expect(result.current.events).toHaveLength(PAGE_SIZE + 1)
    expect(result.current.events.at(-1)?.event_id).toBe('second-page')
    // Page 2 requests the right offset.
    expect(getEvents.mock.calls.at(-1)?.[2]).toMatchObject({
      offset: String(PAGE_SIZE),
    })
  })

  it('applyFilter passes event_type and clears any search results', async () => {
    getEvents.mockResolvedValue([ev('a')])
    searchEvents.mockResolvedValue({ results: [ev('s')] })
    const { result } = renderHook(() => useAgentEvents('a1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setSearchQuery('why'))
    await act(async () => {
      await result.current.runSearch()
    })
    expect(result.current.searchResults).toHaveLength(1)

    await act(async () => {
      await result.current.applyFilter('error')
    })
    expect(result.current.searchResults).toBeNull()
    expect(result.current.filterType).toBe('error')
    expect(getEvents.mock.calls.at(-1)?.[2]).toMatchObject({ event_type: 'error' })
  })

  it('search results override the list until cleared', async () => {
    getEvents.mockResolvedValue([ev('chronological')])
    searchEvents.mockResolvedValue({ results: [ev('semantic')] })
    const { result } = renderHook(() => useAgentEvents('a1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setSearchQuery('refund'))
    await act(async () => {
      await result.current.runSearch()
    })
    expect(result.current.displayEvents[0].event_id).toBe('semantic')

    act(() => result.current.clearSearch())
    expect(result.current.displayEvents[0].event_id).toBe('chronological')
  })

  // Regression: a 400 from an unconfigured embedding provider used to be
  // swallowed, leaving a spinner that stopped with no feedback.
  it('surfaces a setup message when embeddings are unconfigured', async () => {
    getEvents.mockResolvedValue([])
    searchEvents.mockRejectedValue(new Error('No embedding provider configured'))
    const { result } = renderHook(() => useAgentEvents('a1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setSearchQuery('anything'))
    await act(async () => {
      await result.current.runSearch()
    })

    expect(result.current.searchResults).toBeNull()
    expect(result.current.searchError).toMatch(/embedding provider/i)
  })

  // Regression: any error used to redirect to /login, so a transient 500
  // logged the user out.
  it('reports a load failure as an error instead of signing the user out', async () => {
    getEvents.mockRejectedValue(new Error('Internal Server Error'))
    const { result } = renderHook(() => useAgentEvents('a1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toMatch(/Internal Server Error/)
  })
})
