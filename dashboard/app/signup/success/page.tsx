'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getToken } from '@/lib/auth'
import { confirmCheckout, getBillingStatus, type BillingStatus } from '@/lib/api'
import { BrandLogo } from '@/components/BrandLogo'

export default function SignupSuccessPage() {
  return (
    <Suspense fallback={<SuccessFallback message="Confirming your subscription…" />}>
      <SignupSuccessInner />
    </Suspense>
  )
}

function SuccessFallback({ message }: { message: string }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#fafafa', fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <BrandLogo variant="full" />
        <p style={{ marginTop: 24, color: '#666', fontSize: 14 }}>{message}</p>
      </div>
    </div>
  )
}

function SignupSuccessInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [error, setError] = useState('')

  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.replace('/signup')
      return
    }
    if (!sessionId) {
      setError('Missing checkout session. Please try again.')
      return
    }

    let cancelled = false
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    function isPendingStripeConfirmation(status: BillingStatus) {
      if (status.has_access) return false
      if (!status.requires_checkout) return false
      return (
        status.subscription_status === null
        || status.subscription_status === 'pending_checkout'
        || status.subscription_status === 'incomplete'
        || status.subscription_status === 'incomplete_expired'
      )
    }

    async function confirm() {
      const maxAttempts = 5

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const status = await confirmCheckout(token!, sessionId!)
          if (cancelled) return
          if (status.has_access) {
            router.replace('/dashboard')
            return
          }

          const liveStatus = await getBillingStatus(token!)
          if (cancelled) return
          if (liveStatus.has_access) {
            router.replace('/dashboard')
            return
          }

          if (isPendingStripeConfirmation(liveStatus) && attempt < maxAttempts) {
            await wait(2000)
            continue
          }

          setError(
            'Stripe confirmation is taking longer than expected. '
            + 'Please wait a few seconds and try again.',
          )
          return
        } catch (e) {
          if (cancelled) return
          try {
            const liveStatus = await getBillingStatus(token!)
            if (cancelled) return
            if (liveStatus.has_access) {
              router.replace('/dashboard')
              return
            }
            if (isPendingStripeConfirmation(liveStatus) && attempt < maxAttempts) {
              await wait(1500)
              continue
            }
          } catch {
            // Ignore secondary status errors and keep retry logic below.
          }
          if (attempt < maxAttempts) {
            await wait(1500)
            continue
          }
          setError(e instanceof Error ? e.message : 'Could not confirm payment')
          return
        }
      }
    }

    confirm()
    return () => { cancelled = true }
  }, [router, sessionId])

  if (error) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#fafafa', padding: 24,
      }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <p style={{ color: '#ef4444', marginBottom: 16 }}>{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              color: '#111',
              fontWeight: 600,
              display: 'block',
              margin: '0 auto 10px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Check confirmation again
          </button>
          <a href="/signup/plan" style={{ color: '#111', fontWeight: 600 }}>Return to plan selection →</a>
        </div>
      </div>
    )
  }

  return <SuccessFallback message="Payment successful — opening your dashboard…" />
}
