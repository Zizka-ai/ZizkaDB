import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { SIGNUP_CONSENT_GDPR_KEY, SIGNUP_PLAN_KEY } from '@/lib/signup-funnel'
import { useSignupFunnelGuard } from './useSignupFunnelGuard'

const replace = vi.fn()
let currentParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => currentParams,
}))

beforeEach(() => {
  replace.mockReset()
  currentParams = new URLSearchParams()
  sessionStorage.clear()
})

describe('useSignupFunnelGuard', () => {
  it('otp step with no plan redirects to /signup/plan', () => {
    renderHook(() => useSignupFunnelGuard('otp'))
    expect(replace).toHaveBeenCalledWith('/signup/plan')
  })

  it('otp step with plan but no consent redirects to /signup/start', () => {
    sessionStorage.setItem(SIGNUP_PLAN_KEY, 'pro')
    renderHook(() => useSignupFunnelGuard('otp'))
    expect(replace).toHaveBeenCalledWith('/signup/start?plan=pro')
  })

  it('otp step persists ?plan= and is ready when consent exists', () => {
    currentParams = new URLSearchParams('plan=team')
    sessionStorage.setItem(SIGNUP_CONSENT_GDPR_KEY, '1')
    const { result } = renderHook(() => useSignupFunnelGuard('otp'))
    expect(replace).not.toHaveBeenCalled()
    expect(result.current.ready).toBe(true)
    expect(result.current.plan).toBe('team')
    expect(sessionStorage.getItem(SIGNUP_PLAN_KEY)).toBe('team')
  })

  it('consent step with no plan redirects to /signup/plan', () => {
    const { result } = renderHook(() => useSignupFunnelGuard('consent'))
    expect(replace).toHaveBeenCalledWith('/signup/plan')
    expect(result.current.ready).toBe(false)
  })
})
