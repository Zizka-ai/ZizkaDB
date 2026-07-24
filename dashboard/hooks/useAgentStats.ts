'use client'

import { useCallback, useEffect, useState } from 'react'
import { getAgentStats, type AgentStats } from '@/lib/api'
import { getToken } from '@/lib/auth'
import { POLL_INTERVAL_MS } from '@/lib/constants'

/**
 * Summary counters for one agent, refreshed on the shared poll interval.
 * Poll failures stay silent — the already-rendered numbers are better than an
 * error banner over a transient blip.
 */
export function useAgentStats(agentId: string | null) {
  const [stats, setStats] = useState<AgentStats | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (): Promise<AgentStats | null> => {
    if (!agentId) return null
    const token = getToken()
    if (!token) return null
    try {
      const res = await getAgentStats(token, agentId)
      return res
    } catch {
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

    const interval = setInterval(async () => {
      const res = await load()
      if (cancelled || !res) return
      setStats(res)
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [agentId, load])

  return { stats, loading }
}
