'use client'

import { useCallback, useRef, useState } from 'react'
import { getWhyChain, type WhyChain } from '@/lib/api'
import { getToken } from '@/lib/auth'

/**
 * Causal chain for an event, cached per event id so re-opening the Why panel
 * doesn't refetch (chains are immutable once written).
 */
export function useWhyChain() {
  const cache = useRef(new Map<string, WhyChain>())
  const [chain, setChain] = useState<WhyChain | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (eventId: string) => {
    setError(null)

    const cached = cache.current.get(eventId)
    if (cached) {
      setChain(cached)
      return
    }

    const token = getToken()
    if (!token) return

    setLoading(true)
    try {
      const res = await getWhyChain(token, eventId)
      cache.current.set(eventId, res)
      setChain(res)
    } catch (e) {
      setChain(null)
      setError(e instanceof Error ? e.message : 'Failed to trace causal chain')
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setChain(null)
    setError(null)
  }, [])

  return { chain, loading, error, load, reset }
}
