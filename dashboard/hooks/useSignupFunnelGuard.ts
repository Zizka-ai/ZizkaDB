'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  getStoredSignupPlan,
  persistSignupPlanParam,
  resolveSignupStartPlan,
  signupOtpRedirect,
} from '@/lib/signup-funnel'

export type SignupFunnelStep = 'otp' | 'consent'

/**
 * Shared plan/consent gate for /signup (OTP) and /signup/start (consent).
 * Returns ready=false until the user belongs on this step (pages should
 * render a fallback so the form never flashes before a redirect).
 */
export function useSignupFunnelGuard(step: SignupFunnelStep): {
  ready: boolean
  plan: 'pro' | 'team' | null
} {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [ready, setReady] = useState(false)
  const [plan, setPlan] = useState<'pro' | 'team' | null>(null)

  useEffect(() => {
    const planParam = searchParams.get('plan')

    if (step === 'otp') {
      persistSignupPlanParam(planParam)
      const redirect = signupOtpRedirect()
      if (redirect) {
        router.replace(redirect)
        return
      }
      setPlan(getStoredSignupPlan())
      setReady(true)
      return
    }

    const resolved = resolveSignupStartPlan(planParam)
    if (!resolved) {
      router.replace('/signup/plan')
      return
    }
    setPlan(resolved)
    setReady(true)
  }, [searchParams, router, step])

  return { ready, plan }
}
