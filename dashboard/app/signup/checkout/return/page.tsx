'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BrandLogo } from '@/components/BrandLogo'
import { M } from '@/components/marketing/marketing-theme'
import { getBillingStatus } from '@/lib/api'
import { getToken } from '@/lib/auth'

// Stripe's success_url lands here after Checkout completes. The
// checkout.session.completed webhook that actually activates the
// subscription may lag the redirect by a few hundred ms, so poll billing
// status briefly before sending the user on to the dashboard -- but always
// land on /dashboard eventually even if the webhook hasn't arrived yet; the
// dashboard's own billing UI reflects eventual consistency once it does.
const POLL_DELAYS_MS = [500, 750, 1000, 1500, 2000]

export default function CheckoutReturnPage() {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    const token = getToken()
    if (!token) {
      router.replace('/login')
      return
    }

    async function poll() {
      for (const delay of POLL_DELAYS_MS) {
        if (cancelled) return
        try {
          const status = await getBillingStatus(token as string)
          if (!cancelled && (status.has_access || !status.requires_checkout)) {
            router.replace('/dashboard')
            return
          }
        } catch {
          // transient error -- keep polling, don't give up early
        }
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
      if (!cancelled) router.replace('/dashboard')
    }

    poll()
    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        background: M.bg,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <BrandLogo variant="full" />
      <p style={{ fontSize: 15, color: M.muted }}>Activating your account…</p>
    </div>
  )
}
