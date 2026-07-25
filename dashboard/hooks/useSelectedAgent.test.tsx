import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSelectedAgent } from './useSelectedAgent'
import type { Agent } from '@/lib/api'

const replace = vi.fn()
let currentParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/dashboard/activity',
  useSearchParams: () => currentParams,
}))

function agent(name: string): Agent {
  return {
    agent: name,
    first_seen: '2026-01-01T00:00:00Z',
    last_seen: '2026-01-01T00:00:00Z',
    event_count: 1,
  } as Agent
}

beforeEach(() => {
  replace.mockReset()
  currentParams = new URLSearchParams()
})

describe('useSelectedAgent', () => {
  it('returns null when there are no agents', () => {
    const { result } = renderHook(() => useSelectedAgent([]))
    expect(result.current.agentId).toBeNull()
    expect(result.current.invalidAgent).toBe(false)
  })

  // OSS: single agent, no selector UI needed.
  it('auto-selects the only agent when ?agent= is absent', () => {
    const { result } = renderHook(() => useSelectedAgent([agent('solo')]))
    expect(result.current.agentId).toBe('solo')
    expect(result.current.invalidAgent).toBe(false)
  })

  it('honours a valid ?agent=', () => {
    currentParams = new URLSearchParams('agent=b')
    const { result } = renderHook(() =>
      useSelectedAgent([agent('a'), agent('b')]),
    )
    expect(result.current.agentId).toBe('b')
    expect(result.current.invalidAgent).toBe(false)
  })

  // Agent deleted, or a stale/shared link.
  it('falls back to the first agent and flags an unknown ?agent=', () => {
    currentParams = new URLSearchParams('agent=ghost')
    const { result } = renderHook(() =>
      useSelectedAgent([agent('a'), agent('b')]),
    )
    expect(result.current.agentId).toBe('a')
    expect(result.current.invalidAgent).toBe(true)
  })

  it('pins the resolved agent into the URL', () => {
    renderHook(() => useSelectedAgent([agent('a')]))
    expect(replace).toHaveBeenCalledWith('/dashboard/activity?agent=a')
  })

  it('does not rewrite the URL when it already matches', () => {
    currentParams = new URLSearchParams('agent=a')
    renderHook(() => useSelectedAgent([agent('a')]))
    expect(replace).not.toHaveBeenCalled()
  })

  it('selectAgent switches agent while preserving other params', () => {
    currentParams = new URLSearchParams('agent=a&tab=events')
    const { result } = renderHook(() =>
      useSelectedAgent([agent('a'), agent('b')]),
    )

    result.current.selectAgent('b')

    const url = replace.mock.calls.at(-1)?.[0] as string
    expect(url).toContain('agent=b')
    expect(url).toContain('tab=events')
  })

  it('round-trips agent names needing URL encoding', () => {
    const weird = 'my agent/v2'
    currentParams = new URLSearchParams()
    const { result } = renderHook(() => useSelectedAgent([agent(weird)]))

    expect(result.current.agentId).toBe(weird)
    const url = replace.mock.calls.at(-1)?.[0] as string
    // URLSearchParams encodes; decoding must yield the original name.
    expect(new URLSearchParams(url.split('?')[1]).get('agent')).toBe(weird)
  })
})
