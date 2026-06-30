'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getToken } from '@/lib/auth'
import { billingGateRedirect, getBillingStatus } from '@/lib/api'

const IS_DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === 'true'

/**
 * Managed cloud: block dashboard until plan is chosen and Stripe checkout completes.
 * Self-host (NEXT_PUBLIC_DEV_MODE=true): skip billing gate.
 */
export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(IS_DEV_MODE)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    if (IS_DEV_MODE) return

    const token = getToken()
    if (!token) {
      router.replace('/login')
      return
    }

    let cancelled = false

    getBillingStatus(token)
      .then((status) => {
        if (cancelled) return
        const redirect = billingGateRedirect(status)
        if (redirect) {
          setBlocked(true)
          router.replace(redirect)
          return
        }
        setReady(true)
      })
      .catch(() => {
        if (!cancelled) setReady(true)
      })

    return () => { cancelled = true }
  }, [router, pathname])

  if (!ready || blocked) {
    return (
      <div style={{
        minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#888', fontSize: 14,
      }}>
        Checking subscription…
      </div>
    )
  }

  return <>{children}</>
}
