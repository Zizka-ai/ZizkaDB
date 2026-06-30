'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { BrandLogo } from '@/components/BrandLogo'
import { getToken } from '@/lib/auth'
import {
  billingGateRedirect,
  createCheckoutSession,
  getBillingStatus,
  selectBillingPlan,
} from '@/lib/api'

const PLAN_LABELS: Record<'pro' | 'team', string> = {
  pro: 'Pro',
  team: 'Team',
}

function CheckoutFallback() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#fafafa', fontFamily: 'Inter, system-ui, sans-serif', color: '#888',
    }}>
      Redirecting to Stripe…
    </div>
  )
}

export default function SignupCheckoutPage() {
  return (
    <Suspense fallback={<CheckoutFallback />}>
      <SignupCheckoutInner />
    </Suspense>
  )
}

function SignupCheckoutInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planParam = searchParams.get('plan')
  const plan: 'pro' | 'team' | null =
    planParam === 'team' ? 'team' : planParam === 'pro' ? 'pro' : null

  const [error, setError] = useState('')

  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.replace('/signup')
      return
    }
    if (!plan) {
      router.replace('/signup/plan')
      return
    }

    let cancelled = false

    async function startCheckout() {
      try {
        const status = await getBillingStatus(token!)
        if (cancelled) return

        if (status.has_access) {
          router.replace('/dashboard')
          return
        }

        const gate = billingGateRedirect(status)
        if (gate === '/signup/plan') {
          router.replace('/signup/plan')
          return
        }

        if (status.plan && status.plan !== plan) {
          router.replace(`/signup/checkout?plan=${status.plan}`)
          return
        }

        if (!status.plan) {
          await selectBillingPlan(token!, plan!)
        }

        const session = await createCheckoutSession(token!, plan!)
        if (cancelled) return
        if (!session.url) {
          setError('Could not open Stripe checkout.')
          return
        }
        window.location.href = session.url
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not start checkout')
        }
      }
    }

    startCheckout()
    return () => { cancelled = true }
  }, [router, plan])

  if (error) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#fafafa', padding: 24, fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <BrandLogo variant="full" suffix={plan ? PLAN_LABELS[plan] : 'Checkout'} />
          <p style={{ color: '#ef4444', margin: '24px 0 16px', fontSize: 14 }}>{error}</p>
          <Link href="/signup/plan" style={{ color: '#111', fontWeight: 600, textDecoration: 'none' }}>
            ← Back to plan selection
          </Link>
        </div>
      </div>
    )
  }

  return <CheckoutFallback />
}
