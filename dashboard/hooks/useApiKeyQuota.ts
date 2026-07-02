'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getApiKeyUsage, type ApiKeyUsage } from '@/lib/api'
import { getToken } from '@/lib/auth'

export interface ApiKeyQuota extends ApiKeyUsage {
  loading: boolean
  /** Re-fetch account-wide usage. Call after any create/delete. */
  refresh: () => Promise<void>
}

const UNLIMITED_DEFAULT: ApiKeyUsage = {
  plan: null,
  limit: null,
  used: 0,
  unlimited: true,
  at_limit: false,
}

/**
 * Account-wide API key quota. Single source for every screen that creates keys.
 *
 * Fail-open by design: if the usage fetch fails, the quota stays "unlimited" so
 * the UI never blocks a create — the backend guard remains the real enforcement.
 * Refreshes on mount and on window focus (plan/keys may change in another tab).
 */
export function useApiKeyQuota(): ApiKeyQuota {
  const [usage, setUsage] = useState<ApiKeyUsage>(UNLIMITED_DEFAULT)
  const [loading, setLoading] = useState(true)
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    const token = getToken()
    if (!token) {
      // No session: nothing to fetch, but stop showing the loading state so
      // callers relying on `loading` don't hang indefinitely.
      if (mounted.current) setLoading(false)
      return
    }
    try {
      const next = await getApiKeyUsage(token)
      if (mounted.current) setUsage(next)
    } catch {
      // Fail-open: keep the unlimited default; never block the UI on a usage error.
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    refresh()
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      mounted.current = false
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh])

  return { ...usage, loading, refresh }
}
