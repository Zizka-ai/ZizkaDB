'use client'

import { useEffect, useState } from 'react'
import { getToken } from '@/lib/auth'
import { getBillingStatus, type BillingStatus } from '@/lib/api'

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

  useEffect(() => {
    const token = getToken()
    if (!token) return

    let cancelled = false
    getBillingStatus(token)
      .then((s) => { if (!cancelled) setStatus(s) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (!status?.plan) return null

  const label = PLAN_LABELS[status.plan] ?? status.plan.toUpperCase()
  const trialing = status.subscription_status === 'trialing'

  return (
    <div
      className="px-4 sm:px-6 py-2.5 border-b flex flex-wrap items-center justify-between gap-2"
      style={{ background: '#111', borderColor: '#1f1f1f' }}
    >
      <div className="flex items-center gap-2 text-sm">
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
    </div>
  )
}
