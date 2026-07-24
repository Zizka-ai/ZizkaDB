'use client'

import { useCallback, useEffect, useState } from 'react'
import { getAgentSuggestions, type SuggestionsResult } from '@/lib/api'
import { getToken } from '@/lib/auth'

export interface AgentSuggestionsState {
  result: SuggestionsResult | null
  loading: boolean // first load / agent+range change
  refreshing: boolean // regenerate (keeps prior result visible)
  error: string | null
  refetch: () => void
}

/**
 * Fetch AI suggestions for an agent over a date range.
 *
 * - Agent/range change → fresh load (skeleton).
 * - `refetch()` regenerates in place (`?refresh`): the current result stays
 *   visible with `refreshing`, no blank flash.
 * - Responses are guarded against agent/range changes mid-flight, so a slow
 *   response for a previous range can never overwrite the current one.
 */
export function useAgentSuggestions(
  agentId: string | null,
  range: { from: string; to: string } | null,
): AgentSuggestionsState {
  const [result, setResult] = useState<SuggestionsResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  const key = agentId && range ? `${agentId}|${range.from}|${range.to}` : null

  useEffect(() => {
    if (!agentId || !range) {
      setResult(null)
      setLoading(false)
      return
    }
    const token = getToken()
    if (!token) return

    let cancelled = false
    const isRegen = nonce > 0
    if (isRegen && result) setRefreshing(true)
    else setLoading(true)
    setError(null)

    getAgentSuggestions(token, agentId, { ...range, refresh: isRegen })
      .then((res) => {
        if (!cancelled) setResult(res)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to generate suggestions')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
        setRefreshing(false)
      })

    return () => {
      cancelled = true
    }
    // `key` captures agent + range; `nonce` drives regenerate. `result` is read
    // but intentionally not a trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce])

  const refetch = useCallback(() => setNonce((n) => n + 1), [])

  return { result, loading, refreshing, error, refetch }
}
