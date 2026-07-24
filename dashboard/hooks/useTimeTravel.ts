'use client'

import { useCallback, useEffect, useState } from 'react'
import { timeTravel } from '@/lib/api'
import { getToken } from '@/lib/auth'

export interface TimeTravelResult {
  event_count: number
  state: unknown
}

/**
 * State reconstruction at a point in time (`db.at()`).
 *
 * The datetime-local input yields a naive local string; it is converted to a
 * real Date before being sent so the backend gets an unambiguous instant.
 */
export function useTimeTravel(agentId: string | null) {
  const [timestamp, setTimestamp] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TimeTravelResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // A reconstruction belongs to the agent it was run for.
  useEffect(() => {
    setResult(null)
    setError(null)
  }, [agentId])

  const run = useCallback(async () => {
    if (!agentId) return
    if (!timestamp) {
      setError('Pick a date and time first.')
      return
    }
    const parsed = new Date(timestamp)
    if (Number.isNaN(parsed.getTime())) {
      setError('That timestamp could not be read. Pick a date and time again.')
      return
    }
    const token = getToken()
    if (!token) return

    setLoading(true)
    setError(null)
    try {
      const res = await timeTravel(token, agentId, parsed.toISOString())
      setResult(res as unknown as TimeTravelResult)
    } catch (e) {
      setResult(null)
      setError(e instanceof Error ? e.message : 'Could not reconstruct state')
    } finally {
      setLoading(false)
    }
  }, [agentId, timestamp])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { timestamp, setTimestamp, loading, result, error, run, reset }
}
