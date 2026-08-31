'use client'

import { useCallback, useEffect, useState } from 'react'
import { getAgentStats, type AgentStats } from '@/lib/api'
import { getToken } from '@/lib/auth'
import { POLL_INTERVAL_MS } from '@/lib/constants'
import { isDocumentVisible } from '@/lib/page-visible'

/**
 * Summary counters for one agent, refreshed on the shared poll interval.
 * Poll failures stay silent — the already-rendered numbers are better than an
 * error banner over a transient blip.
 *
 * Interval ticks are skipped while the tab is hidden; a load runs when visible.
 */
export function useAgentStats(agentId: string | null) {
  const [stats, setStats] = useState<AgentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [pollError, setPollError] = useState(false)

  const load = useCallback(async (): Promise<AgentStats | null> => {
    if (!agentId) return null
    const token = getToken()
    if (!token) return null
    try {
      const res = await getAgentStats(token, agentId)
      setPollError(false)
      return res
    } catch {
      setPollError(true)
      return null
    }
  }, [agentId])

  useEffect(() => {
    if (!agentId) {
      setStats(null)
      setLoading(false)
      return
    }
    let cancelled = false

    setLoading(true)
    load().then((res) => {
      if (cancelled) return
      if (res) setStats(res)
      setLoading(false)
    })

    const poll = async () => {
      if (cancelled || !isDocumentVisible()) return
      const res = await load()
      if (cancelled || !res) return
      setStats(res)
    }

    const interval = setInterval(() => {
      void poll()
    }, POLL_INTERVAL_MS)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void poll()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [agentId, load])

  return { stats, loading, pollError }
}
