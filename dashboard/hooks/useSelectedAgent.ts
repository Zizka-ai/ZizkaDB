'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { Agent } from '@/lib/api'

export interface SelectedAgentState {
  /** Currently selected agent id, or null when none can be resolved. */
  agentId: string | null
  /** True when the `?agent=` param named an agent that doesn't exist. */
  invalidAgent: boolean
  /** Switch agents (updates the URL; every tab reacts). */
  selectAgent: (agentId: string) => void
}

/**
 * Single source of truth for "which agent am I looking at".
 *
 * The agent lives in the URL (`?agent=`) rather than React state so that
 * back/forward, refresh, bookmarking and sharing all work, and so every tab
 * reads the same value without prop-drilling or context.
 *
 * Resolution rules:
 *  - valid `?agent=` that exists      → use it
 *  - `?agent=` naming a missing agent → fall back to first agent, flag invalid
 *  - no `?agent=`                     → auto-select the first agent
 *
 * The auto-select is what makes OSS (single agent) need no selector UI at all,
 * while Managed uses the same hook with a dropdown — so tab code is identical
 * across editions.
 */
export function useSelectedAgent(agents: Agent[]): SelectedAgentState {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const requested = searchParams.get('agent')

  const { agentId, invalidAgent } = useMemo(() => {
    if (agents.length === 0) {
      return { agentId: null, invalidAgent: false }
    }
    if (requested) {
      const match = agents.find((a) => a.agent === requested)
      if (match) return { agentId: match.agent, invalidAgent: false }
      // Named agent is gone (deleted, or a bad link) — fall back, don't blank.
      return { agentId: agents[0].agent, invalidAgent: true }
    }
    return { agentId: agents[0].agent, invalidAgent: false }
  }, [agents, requested])

  const selectAgent = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('agent', next)
      router.replace(`${pathname}?${params.toString()}`)
    },
    [pathname, router, searchParams],
  )

  // Pin the resolved agent into the URL so links are always shareable and the
  // selection survives a tab switch. Only writes when it would actually change.
  useEffect(() => {
    if (!agentId) return
    if (requested === agentId) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('agent', agentId)
    router.replace(`${pathname}?${params.toString()}`)
  }, [agentId, requested, pathname, router, searchParams])

  return { agentId, invalidAgent, selectAgent }
}
