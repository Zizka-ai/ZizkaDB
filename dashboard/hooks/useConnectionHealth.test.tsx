import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

vi.mock('@/lib/api', () => ({ API: 'http://api.test' }))

import { useConnectionHealth } from './useConnectionHealth'

describe('useConnectionHealth', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true })),
    )
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('fetches /health on mount when the tab is visible', async () => {
    renderHook(() => useConnectionHealth())
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://api.test/health',
        expect.objectContaining({ cache: 'no-store' }),
      )
    })
  })

  it('does not poll /health while the tab is hidden', async () => {
    vi.useFakeTimers()
    renderHook(() => useConnectionHealth())
    await act(async () => {
      await Promise.resolve()
    })
    expect(fetch).toHaveBeenCalledTimes(1)

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    })
    await act(async () => {
      vi.advanceTimersByTime(30_000)
    })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
