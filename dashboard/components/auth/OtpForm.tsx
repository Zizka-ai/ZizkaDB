'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import {
  authInput,
  authLabel,
  authSubmitBtn,
  authSubtitle,
  authTitle,
} from '@/components/marketing/auth-styles'
import { M } from '@/components/marketing/marketing-theme'
import { useResendCooldown } from '@/hooks/useResendCooldown'
import { requestOtp } from '@/lib/api'
import {
  authErrorMessage,
  isAlreadyRegisteredError,
  isNoAccountError,
} from '@/lib/auth-errors'
import { OTP_LENGTH } from '@/lib/constants'

export type OtpFormIntent = 'login' | 'signup'

export function OtpForm({
  intent,
  onVerified,
  initialEmail = '',
  autoFocusEmail = true,
  hideEmailHeading = false,
}: {
  intent: OtpFormIntent
  onVerified: (args: { email: string; otp: string }) => Promise<void | 'aborted'>
  initialEmail?: string
  autoFocusEmail?: boolean
  hideEmailHeading?: boolean
}) {
  const copy = COPY[intent]
  const styles = intent === 'signup' ? SIGNUP_STYLES : LOGIN_STYLES
  const [email, setEmail] = useState(initialEmail)
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [noAccount, setNoAccount] = useState(false)
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)
  const verifyLock = useRef(false)
  const autoSubmitPaused = useRef(false)
  const verifyFormRef = useRef<HTMLFormElement>(null)
  const { cooldown, canResend, startCooldown } = useResendCooldown()

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail)
  }, [initialEmail])

  useEffect(() => {
    if (
      step !== 'otp' ||
      otp.length !== OTP_LENGTH ||
      loading ||
      verifyLock.current ||
      autoSubmitPaused.current
    ) {
      return
    }
    verifyFormRef.current?.requestSubmit()
  }, [otp, step, loading])

  function clearFlags() {
    setError('')
    setNoAccount(false)
    setAlreadyRegistered(false)
  }

  function applyRequestError(err: unknown) {
    setNoAccount(intent === 'login' && isNoAccountError(err))
    setAlreadyRegistered(intent === 'signup' && isAlreadyRegisteredError(err))
  }

  async function sendCode() {
    await requestOtp(email, intent)
    setStep('otp')
    startCooldown()
  }

  async function handleRequestOtp(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    clearFlags()
    try {
      await sendCode()
    } catch (err) {
      applyRequestError(err)
      setError(authErrorMessage(err, copy.requestError))
    } finally {
      setLoading(false)
    }
  }

  async function handleResendOtp() {
    if (!canResend || loading) return
    setLoading(true)
    clearFlags()
    try {
      await sendCode()
    } catch (err) {
      applyRequestError(err)
      setError(authErrorMessage(err, copy.resendError))
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault()
    if (verifyLock.current) return
    verifyLock.current = true
    setLoading(true)
    clearFlags()
    try {
      const result = await onVerified({ email, otp })
      if (result === 'aborted') {
        autoSubmitPaused.current = true
        verifyLock.current = false
        setLoading(false)
      }
    } catch (err) {
      verifyLock.current = false
      applyRequestError(err)
      setError(authErrorMessage(err, copy.verifyError))
      setLoading(false)
    }
  }

  function handleUseDifferentEmail() {
    verifyLock.current = false
    autoSubmitPaused.current = false
    setStep('email')
    setOtp('')
    clearFlags()
  }

  const errorBlock = error ? (
    <ErrorBlock
      intent={intent}
      error={error}
      email={email}
      noAccount={noAccount}
      alreadyRegistered={alreadyRegistered}
    />
  ) : null

  if (step === 'email') {
    return (
      <>
        {!hideEmailHeading && (
          <>
            <h1 style={styles.title}>{copy.emailTitle}</h1>
            <p style={styles.subtitle}>{copy.emailSubtitle}</p>
          </>
        )}
        <form
          onSubmit={handleRequestOtp}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <div>
            <label htmlFor="otp-form-email" style={styles.label}>
              {copy.emailLabel}
            </label>
            <input
              id="otp-form-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoFocus={autoFocusEmail}
              style={styles.emailInput}
              onFocus={(e) => {
                e.target.style.borderColor = styles.focusBorder
              }}
              onBlur={(e) => {
                e.target.style.borderColor = styles.blurBorder
              }}
            />
          </div>
          {errorBlock}
          <button
            type="submit"
            disabled={loading || !email}
            style={{
              ...styles.submit,
              opacity: loading || !email ? 0.4 : 1,
            }}
          >
            {loading ? copy.sendingLabel : copy.sendLabel}
          </button>
          {copy.emailHint ? (
            <p style={{ fontSize: 12, color: '#bbb', textAlign: 'center' }}>
              {copy.emailHint}
            </p>
          ) : null}
        </form>
      </>
    )
  }

  return (
    <>
      <h1 style={styles.title}>{copy.otpTitle}</h1>
      <p style={styles.subtitle}>
        We sent a 6-digit code to{' '}
        <strong style={{ color: styles.emailStrong }}>{email}</strong>
      </p>
      <form
        ref={verifyFormRef}
        onSubmit={handleVerifyOtp}
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <div>
          <label htmlFor="otp-form-code" style={styles.label}>
            {copy.otpLabel}
          </label>
          <input
            id="otp-form-code"
            type="text"
            value={otp}
            onChange={(e) => {
              autoSubmitPaused.current = false
              setOtp(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))
            }}
            placeholder="000000"
            required
            autoFocus
            maxLength={OTP_LENGTH}
            disabled={loading}
            style={styles.otpInput}
            onFocus={(e) => {
              e.target.style.borderColor = styles.focusBorder
            }}
            onBlur={(e) => {
              e.target.style.borderColor = styles.blurBorder
            }}
          />
        </div>
        {errorBlock}
        <button
          type="submit"
          disabled={loading || otp.length < OTP_LENGTH}
          style={{
            ...styles.submit,
            opacity: loading || otp.length < OTP_LENGTH ? 0.4 : 1,
          }}
        >
          {loading ? copy.verifyingLabel : copy.verifyLabel}
        </button>
        <button
          type="button"
          onClick={handleResendOtp}
          disabled={!canResend || loading}
          style={{
            fontSize: 13,
            color: canResend ? styles.resendReady : styles.resendWait,
            background: 'none',
            border: 'none',
            cursor: canResend && !loading ? 'pointer' : 'not-allowed',
          }}
        >
          {canResend ? 'Resend code' : `Resend code in ${cooldown}s`}
        </button>
        <button
          type="button"
          onClick={handleUseDifferentEmail}
          style={{
            fontSize: 13,
            color: styles.backLink,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          ← Use a different email
        </button>
      </form>
    </>
  )
}

function ErrorBlock({
  intent,
  error,
  email,
  noAccount,
  alreadyRegistered,
}: {
  intent: OtpFormIntent
  error: string
  email: string
  noAccount: boolean
  alreadyRegistered: boolean
}) {
  if (intent === 'signup') {
    return (
      <p style={{ fontSize: 13, color: M.danger, margin: 0 }}>
        {error}
        {alreadyRegistered ? (
          <>
            {' '}
            <Link
              href={`/login?email=${encodeURIComponent(email)}`}
              style={{ color: M.brandLight, fontWeight: 600 }}
            >
              Sign in →
            </Link>
          </>
        ) : null}
      </p>
    )
  }

  return (
    <div style={{ fontSize: 13, color: '#ef4444' }}>
      <p style={{ margin: 0 }}>{error}</p>
      {noAccount ? (
        <Link
          href="/signup"
          style={{
            display: 'inline-block',
            marginTop: 10,
            padding: '8px 14px',
            borderRadius: 8,
            background: '#111',
            color: '#fff',
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: 13,
          }}
        >
          Create account
        </Link>
      ) : null}
    </div>
  )
}

const COPY = {
  login: {
    emailTitle: 'Sign in',
    emailSubtitle: "Enter your email and we'll send a 6-digit login code.",
    emailLabel: 'Email address',
    sendLabel: 'Send code →',
    sendingLabel: 'Sending...',
    emailHint: 'We send a 6-digit code to your email. No password needed.',
    otpTitle: 'Check your email',
    otpLabel: 'Login code',
    verifyLabel: 'Sign in →',
    verifyingLabel: 'Signing you in…',
    requestError: 'Failed to send code. Try again.',
    resendError: 'Failed to resend code. Try again.',
    verifyError: 'Invalid or expired code.',
  },
  signup: {
    emailTitle: 'Create your account',
    emailSubtitle: 'Enter your email. We send a 6-digit code — no password needed.',
    emailLabel: 'Work email',
    sendLabel: 'Send verification code →',
    sendingLabel: 'Sending...',
    emailHint: '',
    otpTitle: 'Verify your email',
    otpLabel: 'Verification code',
    verifyLabel: 'Create account →',
    verifyingLabel: 'Verifying...',
    requestError: 'Could not send code. Please try again.',
    resendError: 'Failed to resend code. Try again.',
    verifyError: 'Invalid or expired code.',
  },
} as const

const LOGIN_INPUT: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 14px',
  borderRadius: 9,
  fontSize: 14,
  border: '1px solid #ddd',
  outline: 'none',
  color: '#111',
  background: '#fafafa',
}

const LOGIN_STYLES = {
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#111',
    marginBottom: 6,
  } satisfies CSSProperties,
  subtitle: { fontSize: 14, color: '#888', marginBottom: 24 } satisfies CSSProperties,
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#555',
    marginBottom: 6,
  } satisfies CSSProperties,
  emailInput: LOGIN_INPUT,
  otpInput: {
    ...LOGIN_INPUT,
    padding: 12,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: '0.4em',
    fontFamily: 'monospace',
  } satisfies CSSProperties,
  submit: {
    padding: 11,
    borderRadius: 9,
    fontSize: 14,
    fontWeight: 500,
    background: '#111',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
  } satisfies CSSProperties,
  focusBorder: '#111',
  blurBorder: '#ddd',
  emailStrong: '#111',
  resendReady: '#555',
  resendWait: '#bbb',
  backLink: '#888',
}

const SIGNUP_STYLES = {
  title: authTitle,
  subtitle: authSubtitle,
  label: authLabel,
  emailInput: authInput,
  otpInput: {
    ...authInput,
    padding: '12px',
    fontSize: 28,
    textAlign: 'center',
    letterSpacing: '0.4em',
    fontFamily: 'monospace',
  } satisfies CSSProperties,
  submit: authSubmitBtn,
  focusBorder: M.brandLight,
  blurBorder: M.lineStrong,
  emailStrong: M.ink,
  resendReady: M.muted,
  resendWait: M.faint,
  backLink: M.faint,
}
