'use client'

import { useEffect, useState } from 'react'
import { API } from '@/lib/api'

export type HealthState = 'checking' | 'ok' | 'error'

/**
 * Liveness of the backend API, polled every 30s. Extracted from the old
 * ConnectionStatus banner so the header can show a compact dot instead of a
 * full-width block in the content area.
 */
export function useConnectionHealth(): HealthState {
  const [health, setHealth] = useState<HealthState>('checking')

  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const res = await fetch(`${API}/health`, { cache: 'no-store' })
        if (!cancelled) setHealth(res.ok ? 'ok' : 'error')
      } catch {
        if (!cancelled) setHealth('error')
      }
    }
    check()
    const id = setInterval(check, 30_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return health
}
