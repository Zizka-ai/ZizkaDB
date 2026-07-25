'use client'

import { useCallback, useEffect, useState } from 'react'
import { getAgents, type Agent } from '@/lib/api'
import { getToken } from '@/lib/auth'
import { POLL_INTERVAL_MS } from '@/lib/constants'

export interface AgentsState {
  agents: Agent[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Module-level store shared by every `useAgents()` caller.
 *
 * The shell (agent selector) and the active tab both need the agent list. With
 * per-hook state they would run two independent polls and could disagree —
 * deleting an agent on Fleet would leave a stale entry in the selector until
 * its own timer fired. One store, one poll, one truth.
 *
 * This is a ~30-line pub/sub, not a state library: the project convention
 * against React Query/Redux/Context still holds.
 */
interface Snapshot {
  agents: Agent[]
  loading: boolean
  error: string | null
}

let snapshot: Snapshot = { agents: [], loading: true, error: null }
const subscribers = new Set<(s: Snapshot) => void>()
let pollTimer: ReturnType<typeof setInterval> | null = null

function publish(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next }
  subscribers.forEach((fn) => fn(snapshot))
}

async function fetchAgents(isInitial: boolean) {
  const token = getToken()
  if (!token) {
    publish({ loading: false })
    return
  }
  try {
    const list = await getAgents(token)
    publish({ agents: Array.isArray(list) ? list : [], error: null, loading: false })
  } catch (e) {
    // Poll failures stay silent: a transient blip shouldn't replace a working
    // screen with an error. Only the first load surfaces one.
    if (isInitial) {
      publish({ error: e instanceof Error ? e.message : 'Failed to load agents', loading: false })
    }
  }
}

export function useAgents(pollMs: number = POLL_INTERVAL_MS): AgentsState {
  const [state, setState] = useState<Snapshot>(snapshot)

  useEffect(() => {
    let cancelled = false
    const listener = (s: Snapshot) => {
      if (!cancelled) setState(s)
    }
    subscribers.add(listener)

    // First subscriber starts the shared poll and the initial fetch.
    if (subscribers.size === 1) {
      fetchAgents(true)
      pollTimer = setInterval(() => fetchAgents(false), pollMs)
    } else {
      setState(snapshot)
    }

    return () => {
      cancelled = true
      subscribers.delete(listener)
      // Last one out stops the poll, so nothing runs after leaving the dashboard.
      if (subscribers.size === 0 && pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
        snapshot = { agents: [], loading: true, error: null }
      }
    }
  }, [pollMs])

  const refresh = useCallback(() => fetchAgents(false), [])

  return { ...state, refresh }
}
