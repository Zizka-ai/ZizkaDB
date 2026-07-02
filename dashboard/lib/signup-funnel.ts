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
