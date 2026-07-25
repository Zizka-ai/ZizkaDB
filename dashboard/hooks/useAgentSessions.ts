'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  getAgentSessions,
  getEvents,
  getMemoryDiff,
  type AgentEvent,
  type AgentSession,
} from '@/lib/api'
import { getToken } from '@/lib/auth'

/**
 * Session list for an agent, plus lazily-loaded detail (events + memory diff)
 * for whichever session is open.
 *
 * The memory diff is best-effort: it 404s for sessions written before memory
 * tracking existed, and that must not block the event list.
 */
export function useAgentSessions(agentId: string | null) {
  const [sessions, setSessions] = useState<AgentSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selected, setSelected] = useState<AgentSession | null>(null)
  const [detailEvents, setDetailEvents] = useState<AgentEvent[]>([])
  const [detailDiff, setDetailDiff] = useState<Record<string, unknown> | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    if (!agentId) {
      setSessions([])
      setLoading(false)
      return
    }
    let cancelled = false

    setLoading(true)
    setError(null)
    setSelected(null)
    setDetailEvents([])
    setDetailDiff(null)

    const token = getToken()
    if (!token) return

    getAgentSessions(token, agentId)
      .then((res) => {
        if (cancelled) return
        setSessions(res)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load sessions')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [agentId])

  const openSession = useCallback(
    async (session: AgentSession) => {
      if (!agentId) return
      const token = getToken()
      if (!token) return

      setSelected(session)
      setDetailLoading(true)
      setDetailEvents([])
      setDetailDiff(null)

      const [events, diff] = await Promise.all([
        getEvents(token, agentId, { session_id: session.session_id, limit: '200' }).catch(
          () => [] as AgentEvent[],
        ),
        // Non-fatal: older sessions have no recorded memory diff.
        getMemoryDiff(token, session.session_id).catch(() => null),
      ])

      setDetailEvents(events)
      setDetailDiff(diff)
      setDetailLoading(false)
    },
    [agentId],
  )

  return {
    sessions,
    loading,
    error,
    selected,
    detailEvents,
    detailDiff,
    detailLoading,
    openSession,
  }
}
