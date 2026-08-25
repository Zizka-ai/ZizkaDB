import { afterEach, describe, expect, it } from 'vitest'
import {
  SIGNUP_CONSENT_GDPR_KEY,
  SIGNUP_CONSENT_MARKETING_KEY,
  SIGNUP_PLAN_KEY,
  clearSignupSession,
  getStoredSignupPlan,
  hasSignupConsent,
  persistSignupPlanParam,
  resolveSignupStartPlan,
  signupOtpRedirect,
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

  it('persistSignupPlanParam stores only pro or team', () => {
    persistSignupPlanParam('enterprise')
    expect(sessionStorage.getItem(SIGNUP_PLAN_KEY)).toBeNull()
    persistSignupPlanParam('pro')
    expect(sessionStorage.getItem(SIGNUP_PLAN_KEY)).toBe('pro')
  })

  it('signupOtpRedirect sends to plan, then consent, then null', () => {
    expect(signupOtpRedirect()).toBe('/signup/plan')
    sessionStorage.setItem(SIGNUP_PLAN_KEY, 'team')
    expect(signupOtpRedirect()).toBe('/signup/start?plan=team')
    sessionStorage.setItem(SIGNUP_CONSENT_GDPR_KEY, '1')
    expect(signupOtpRedirect()).toBeNull()
  })

  it('resolveSignupStartPlan prefers URL plan and persists it', () => {
    expect(resolveSignupStartPlan(null)).toBeNull()
    expect(resolveSignupStartPlan('pro')).toBe('pro')
    expect(sessionStorage.getItem(SIGNUP_PLAN_KEY)).toBe('pro')
    expect(resolveSignupStartPlan('enterprise')).toBe('pro')
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
