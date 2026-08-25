import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useResendCooldown } from './useResendCooldown'

describe('useResendCooldown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts able to resend and locks for the configured window', () => {
    const { result } = renderHook(() => useResendCooldown(3))
    expect(result.current.canResend).toBe(true)
    expect(result.current.cooldown).toBe(0)

    act(() => {
      result.current.startCooldown()
    })
    expect(result.current.canResend).toBe(false)
    expect(result.current.cooldown).toBe(3)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.cooldown).toBe(2)

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current.cooldown).toBe(0)
    expect(result.current.canResend).toBe(true)
  })
})
