'use client'

import { useEffect, useState } from 'react'
import { getApiKeyUsage } from '@/lib/api'
import { getToken } from '@/lib/auth'

export type Edition = 'oss' | 'managed'

export interface EditionState {
  edition: Edition
  plan: string | null
  loading: boolean
}

/** Plans that mean "managed cloud" (multi-agent + fleet). */
const MANAGED_PLANS = new Set(['pro', 'team', 'enterprise'])

/**
 * Resolve which product edition the dashboard is running as.
 *
 * Detection order:
 *  1. `NEXT_PUBLIC_DEPLOYMENT_MODE` — deterministic, mirrors the backend's
 *     `DEPLOYMENT_MODE`. This is the authoritative signal.
 *  2. Plan lookup fallback (`/v1/auth/api-keys/usage`).
 *
 * Why a fallback is needed: the plan is only populated when
 * `API_KEY_LIMITS_ENFORCED=true` (off by default), and self-hosted installs get
 * `users.plan` backfilled to 'pro' on every boot — so plan alone would show
 * fleet features to OSS users.
 *
 * Fails CLOSED to `oss`: showing a self-hoster a Fleet tab they can't use is
 * worse than hiding it from a managed user, who can still reach it by URL.
 */
export function useEdition(): EditionState {
  const envMode = process.env.NEXT_PUBLIC_DEPLOYMENT_MODE?.trim().toLowerCase()
  const envEdition: Edition | null =
    envMode === 'self_hosted' ? 'oss' : envMode === 'managed' ? 'managed' : null

  const [state, setState] = useState<EditionState>({
    edition: envEdition ?? 'oss', // fail closed until proven otherwise
    plan: null,
    loading: envEdition === null,
  })

  useEffect(() => {
    // Authoritative signal present — no network call needed.
    if (envEdition !== null) {
      setState({ edition: envEdition, plan: null, loading: false })
      return
    }

    const token = getToken()
    if (!token) {
      setState({ edition: 'oss', plan: null, loading: false })
      return
    }

    let cancelled = false
    getApiKeyUsage(token)
      .then((usage) => {
        if (cancelled) return
        const plan = usage.plan ?? null
        setState({
          edition: plan && MANAGED_PLANS.has(plan) ? 'managed' : 'oss',
          plan,
          loading: false,
        })
      })
      .catch(() => {
        if (!cancelled) setState({ edition: 'oss', plan: null, loading: false })
      })

    return () => {
      cancelled = true
    }
  }, [envEdition])

  return state
}
