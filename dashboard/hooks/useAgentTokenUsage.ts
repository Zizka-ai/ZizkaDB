'use client'

import { useCallback, useEffect, useState } from 'react'
import { getAgentTokenUsage, type TokenUsageGranularity, type TokenUsagePayload } from '@/lib/api'
import { getToken } from '@/lib/auth'

export interface AgentTokenUsageState {
  usage: TokenUsagePayload | null
  loading: boolean // true only on the first load / agent+range change
  refreshing: boolean // true during a regenerate (keeps the old payload visible)
  error: string | null
  refetch: () => void
}

/**
 * Fetch the token-usage report for an agent over a date range.
 *
 * Mirrors `useAgentReport` exactly: a change of agent or range does a fresh
 * load (skeleton); `refetch()` regenerates in place with a `refreshing` flag
 * so there's no blank flash; responses are guarded against agent/range
 * changes mid-flight so a slow response for a stale range can never overwrite
 * the current one; the effect's dependency array is just `[key, nonce]` so
 * switching the period filter or agent triggers exactly one request.
 */
export function useAgentTokenUsage(
  agentId: string | null,
  range: { from: string; to: string; granularity: TokenUsageGranularity } | null,
): AgentTokenUsageState {
  const [usage, setUsage] = useState<TokenUsagePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  const key = agentId && range ? `${agentId}|${range.from}|${range.to}|${range.granularity}` : null

  useEffect(() => {
    if (!agentId || !range) {
      setUsage(null)
      setLoading(false)
      return
    }
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }

    let cancelled = false
    const isRegen = nonce > 0
    if (isRegen && usage) setRefreshing(true)
    else setLoading(true)
    setError(null)

    getAgentTokenUsage(token, agentId, range)
      .then((res) => {
        if (cancelled) return
        setUsage(res)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load token usage')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
        setRefreshing(false)
      })

    return () => {
      cancelled = true
    }
    // `key` captures agent + range; `nonce` drives regenerate. `usage` is read
    // but intentionally not a trigger (mirrors useAgentReport).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce])

  const refetch = useCallback(() => setNonce((n) => n + 1), [])

  return { usage, loading, refreshing, error, refetch }
}
