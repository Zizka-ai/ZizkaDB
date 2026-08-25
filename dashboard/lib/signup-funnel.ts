/** sessionStorage keys for the signup funnel (plan → consent → OTP). */

export const SIGNUP_PLAN_KEY = 'signup_plan'
export const SIGNUP_CONSENT_GDPR_KEY = 'signup_consent_gdpr'
export const SIGNUP_CONSENT_MARKETING_KEY = 'signup_consent_marketing'

export function clearSignupSession(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(SIGNUP_PLAN_KEY)
  sessionStorage.removeItem(SIGNUP_CONSENT_GDPR_KEY)
  sessionStorage.removeItem(SIGNUP_CONSENT_MARKETING_KEY)
}

export function hasSignupConsent(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem(SIGNUP_CONSENT_GDPR_KEY) === '1'
}

export function getStoredSignupPlan(): 'pro' | 'team' | null {
  if (typeof window === 'undefined') return null
  const stored = sessionStorage.getItem(SIGNUP_PLAN_KEY)
  return stored === 'pro' || stored === 'team' ? stored : null
}

/** Persist `?plan=pro|team` from the URL. Ignores any other value. */
export function persistSignupPlanParam(planParam: string | null): void {
  if (typeof window === 'undefined') return
  if (planParam === 'pro' || planParam === 'team') {
    sessionStorage.setItem(SIGNUP_PLAN_KEY, planParam)
  }
}

/**
 * Where `/signup` (OTP) should send the user, or null if they belong there.
 * Call after persistSignupPlanParam so `?plan=` is already stored.
 */
export function signupOtpRedirect(): string | null {
  const stored = getStoredSignupPlan()
  if (!stored) return '/signup/plan'
  if (!hasSignupConsent()) return `/signup/start?plan=${stored}`
  return null
}

/**
 * Plan for `/signup/start`. Persists a valid URL or stored plan.
 * Returns null when the user must go back to `/signup/plan`.
 */
export function resolveSignupStartPlan(planParam: string | null): 'pro' | 'team' | null {
  if (typeof window === 'undefined') return null
  const resolved =
    planParam === 'pro' || planParam === 'team' ? planParam : getStoredSignupPlan()
  if (!resolved) return null
  sessionStorage.setItem(SIGNUP_PLAN_KEY, resolved)
  return resolved
}
