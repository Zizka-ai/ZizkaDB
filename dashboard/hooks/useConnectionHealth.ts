'use client'

import { useEffect, useState } from 'react'
import { API } from '@/lib/api'
import { isDocumentVisible } from '@/lib/page-visible'

export type HealthState = 'checking' | 'ok' | 'error'

const POLL_MS = 30_000

/**
 * Liveness of the backend API, polled every 30s. Extracted from the old
 * ConnectionStatus banner so the header can show a compact dot instead of a
 * full-width block in the content area.
 *
 * Interval ticks are skipped while the tab is hidden; a check runs again
 * when the tab becomes visible.
 */
export function useConnectionHealth(): HealthState {
  const [health, setHealth] = useState<HealthState>('checking')

  useEffect(() => {
    let cancelled = false
    async function check() {
      if (!isDocumentVisible()) return
      try {
        const res = await fetch(`${API}/health`, { cache: 'no-store' })
        if (!cancelled) setHealth(res.ok ? 'ok' : 'error')
      } catch {
        if (!cancelled) setHealth('error')
      }
    }
    check()
    const id = setInterval(check, POLL_MS)
    const onVis = () => {
      if (document.visibilityState === 'visible') void check()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  return health
}
