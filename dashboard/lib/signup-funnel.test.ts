import { afterEach, describe, expect, it } from 'vitest'
import {
  SIGNUP_CONSENT_GDPR_KEY,
  SIGNUP_CONSENT_MARKETING_KEY,
  SIGNUP_PLAN_KEY,
  clearSignupSession,
  getStoredSignupPlan,
  hasSignupConsent,
} from './signup-funnel'

describe('signup-funnel helpers', () => {
  afterEach(() => {
    sessionStorage.clear()
  })

  it('hasSignupConsent is true only when GDPR flag is 1', () => {
    expect(hasSignupConsent()).toBe(false)
    sessionStorage.setItem(SIGNUP_CONSENT_GDPR_KEY, '0')
    expect(hasSignupConsent()).toBe(false)
    sessionStorage.setItem(SIGNUP_CONSENT_GDPR_KEY, '1')
    expect(hasSignupConsent()).toBe(true)
  })

  it('getStoredSignupPlan accepts only pro or team', () => {
    expect(getStoredSignupPlan()).toBeNull()
    sessionStorage.setItem(SIGNUP_PLAN_KEY, 'enterprise')
    expect(getStoredSignupPlan()).toBeNull()
    sessionStorage.setItem(SIGNUP_PLAN_KEY, 'pro')
    expect(getStoredSignupPlan()).toBe('pro')
    sessionStorage.setItem(SIGNUP_PLAN_KEY, 'team')
    expect(getStoredSignupPlan()).toBe('team')
  })

  it('clearSignupSession removes plan and both consent keys', () => {
    sessionStorage.setItem(SIGNUP_PLAN_KEY, 'pro')
    sessionStorage.setItem(SIGNUP_CONSENT_GDPR_KEY, '1')
    sessionStorage.setItem(SIGNUP_CONSENT_MARKETING_KEY, '1')
    clearSignupSession()
    expect(sessionStorage.getItem(SIGNUP_PLAN_KEY)).toBeNull()
    expect(sessionStorage.getItem(SIGNUP_CONSENT_GDPR_KEY)).toBeNull()
    expect(sessionStorage.getItem(SIGNUP_CONSENT_MARKETING_KEY)).toBeNull()
  })
})
