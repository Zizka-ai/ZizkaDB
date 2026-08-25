import { describe, expect, it } from 'vitest'
import { AuthRequestError } from './api'
import {
  authErrorMessage,
  isAlreadyRegisteredError,
  isGdprConsentError,
  isNoAccountError,
} from './auth-errors'

describe('auth-errors classifiers', () => {
  it('isNoAccountError matches 404 AuthRequestError', () => {
    expect(isNoAccountError(new AuthRequestError('No account', 404))).toBe(true)
    expect(isNoAccountError(new AuthRequestError('Conflict', 409))).toBe(false)
    expect(isNoAccountError(new Error('No account'))).toBe(false)
  })

  it('isAlreadyRegisteredError matches 409 AuthRequestError', () => {
    expect(isAlreadyRegisteredError(new AuthRequestError('Taken', 409))).toBe(true)
    expect(isAlreadyRegisteredError(new AuthRequestError('No account', 404))).toBe(false)
  })

  it('isGdprConsentError matches 401 messages that mention GDPR consent', () => {
    expect(
      isGdprConsentError(new AuthRequestError('GDPR consent required', 401)),
    ).toBe(true)
    expect(isGdprConsentError(new AuthRequestError('Invalid token', 401))).toBe(false)
    expect(
      isGdprConsentError(new AuthRequestError('GDPR consent required', 400)),
    ).toBe(false)
  })

  it('authErrorMessage prefers Error.message then fallback', () => {
    expect(authErrorMessage(new AuthRequestError('OTP expired', 401), 'fallback')).toBe(
      'OTP expired',
    )
    expect(authErrorMessage(new Error('network'), 'fallback')).toBe('network')
    expect(authErrorMessage('not-an-error', 'fallback')).toBe('fallback')
  })
})
