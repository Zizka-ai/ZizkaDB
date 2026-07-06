'use client'

import { getBillingStatus, type BillingStatus } from '@/lib/api'
import { getSessionEmail, getToken } from '@/lib/auth'
import { useEffect, useState } from 'react'

const PLAN_LABELS: Record<string, string> = {
  pro: 'Pro',
  team: 'Team',
}

function formatTrialEnd(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function TenantPlanBanner() {
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const email = getSessionEmail()

  useEffect(() => {
    const token = getToken()
    if (!token) return

    let cancelled = false
    getBillingStatus(token)
      .then((s) => { if (!cancelled) setStatus(s) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (!status?.plan && !email) return null

  const label = status?.plan
    ? (PLAN_LABELS[status.plan] ?? status.plan.toUpperCase())
    : null
  const trialing = status?.subscription_status === 'trialing'

  return (
    <div
      className="px-4 sm:px-6 py-2.5 border-b"
      style={{ background: '#111', borderColor: '#1f1f1f' }}
    >
    {status?.plan && label && (
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <span style={{ color: '#a3a3a3' }}>Plan</span>
        <span
          className="font-semibold px-2.5 py-0.5 rounded-full"
          style={{
            background: status.plan === 'team' ? '#1e3a5f' : '#3f2a14',
            color: status.plan === 'team' ? '#93c5fd' : '#fdba74',
          }}
        >
          {label}
        </span>
        {trialing && status.trial_ends_at && (
          <span style={{ color: '#d4d4d4' }}>
            · Free trial until {formatTrialEnd(status.trial_ends_at)}
          </span>
        )}
        {!trialing && status.subscription_status === 'active' && (
          <span style={{ color: '#86efac' }}>· Active</span>
        )}
      </div>
    )}
    {email && (
      <p
        className="truncate max-w-full sm:max-w-xs md:max-w-md text-xs sm:text-sm mt-1 mb-0"
        style={{ color: '#a3a3a3' }}
        title={email}
      >
        {email}
      </p>
    )}
    </div>
  )
}
