'use client'

import { useCallback, useEffect, useState } from 'react'
import { getAgentBaseline, type AgentBaseline } from '@/lib/api'
import { getToken } from '@/lib/auth'

export type BehaviorWindow = '24h' | '7d' | '30d' | undefined

/**
 * Baseline / drift analysis for one agent.
 *
 * `window` undefined means "by sessions" (the backend default); the three
 * time windows are explicit overrides.
 */
export function useAgentBehavior(agentId: string | null) {
  const [baseline, setBaseline] = useState<AgentBaseline | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [window, setWindow] = useState<BehaviorWindow>(undefined)
  // Bumped by `recompute()` to re-run the effect without duplicating fetch code.
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!agentId) {
      setBaseline(null)
      setLoading(false)
      return
    }
    let cancelled = false

    const token = getToken()
    if (!token) return

    setLoading(true)
    setError(null)

    getAgentBaseline(token, agentId, 50, window)
      .then((res) => {
        if (cancelled) return
        setBaseline(res)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setBaseline(null)
        setError(e instanceof Error ? e.message : 'Failed to load behavior baseline')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [agentId, window, nonce])

  const recompute = useCallback(() => setNonce((n) => n + 1), [])

  return { baseline, loading, error, window, setWindow, recompute }
}
