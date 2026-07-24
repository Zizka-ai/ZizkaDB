'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getEvents, searchEvents, type AgentEvent } from '@/lib/api'
import { getToken } from '@/lib/auth'
import { POLL_INTERVAL_MS } from '@/lib/constants'
import { normalizeSearchResults } from '@/lib/events'

export const PAGE_SIZE = 50

export interface AgentEventsState {
  events: AgentEvent[]
  displayEvents: AgentEvent[]
  loading: boolean
  error: string | null
  hasMore: boolean
  filterType: string | null
  searchQuery: string
  searching: boolean
  searchResults: AgentEvent[] | null
  searchError: string | null
  setSearchQuery: (q: string) => void
  applyFilter: (type: string | null) => Promise<void>
  runSearch: () => Promise<void>
  clearSearch: () => void
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
}

/**
 * Events for one agent: paging, type filter, agent-scoped semantic search and
 * live polling.
 *
 * Behaviour is preserved from the previous agent-detail page:
 *  - page size 50; `hasMore` is true when a full page came back
 *  - "load more" appends, filters reset to page 1
 *  - search results replace the list until cleared
 *  - polling pauses while search results are shown, so they aren't clobbered
 *
 * Two deliberate fixes over the original:
 *  - a failed event load no longer force-redirects to /login on ANY error
 *    (a transient 500 used to log people out); only auth failures do
 *  - search failures surface an error instead of silently doing nothing
 */
export function useAgentEvents(agentId: string | null): AgentEventsState {
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filterType, setFilterType] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<AgentEvent[] | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)

  // Guards against a slow response for a previous agent overwriting the
  // current one when the user switches agents mid-flight.
  const requestFor = useRef<string | null>(null)

  const fetchEvents = useCallback(
    async (pageNum: number, append: boolean, type: string | null) => {
      if (!agentId) return
      const token = getToken()
      if (!token) return

      requestFor.current = agentId
      const issuedFor = agentId

      const params: Record<string, string> = {
        limit: String(PAGE_SIZE),
        offset: String((pageNum - 1) * PAGE_SIZE),
      }
      if (type) params.event_type = type

      try {
        const rows = await getEvents(token, agentId, params)
        if (requestFor.current !== issuedFor) return // stale
        setEvents((prev) => (append ? [...prev, ...rows] : rows))
        setHasMore(rows.length === PAGE_SIZE)
        setError(null)
      } catch (e) {
        if (requestFor.current !== issuedFor) return
        setError(e instanceof Error ? e.message : 'Failed to load events')
      }
    },
    [agentId],
  )

  // Initial load / agent switch.
  useEffect(() => {
    if (!agentId) {
      setEvents([])
      setLoading(false)
      return
    }
    let cancelled = false

    setLoading(true)
    setPage(1)
    setFilterType(null)
    setSearchResults(null)
    setSearchQuery('')
    setSearchError(null)

    fetchEvents(1, false, null).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [agentId, fetchEvents])

  // Live polling. Paused while search results are displayed so they survive.
  useEffect(() => {
    if (!agentId || loading || searchResults) return
    let cancelled = false

    const interval = setInterval(() => {
      if (cancelled) return
      fetchEvents(1, false, filterType)
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [agentId, loading, searchResults, filterType, fetchEvents])

  const applyFilter = useCallback(
    async (type: string | null) => {
      setFilterType(type)
      setPage(1)
      setSearchResults(null)
      setSearchError(null)
      await fetchEvents(1, false, type)
    },
    [fetchEvents],
  )

  const loadMore = useCallback(async () => {
    const next = page + 1
    setPage(next)
    await fetchEvents(next, true, filterType)
  }, [page, filterType, fetchEvents])

  const runSearch = useCallback(async () => {
    const q = searchQuery.trim()
    if (!q || !agentId) {
      setSearchResults(null)
      return
    }
    const token = getToken()
    if (!token) return

    setSearching(true)
    setSearchError(null)
    try {
      const res = await searchEvents(token, q, agentId)
      setSearchResults(normalizeSearchResults(res))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Search failed'
      // The API returns 400 when no embedding provider is configured. Say so
      // plainly instead of rendering an empty "no results" state.
      setSearchError(
        /embedding/i.test(msg)
          ? 'Semantic search needs an embedding provider. Configure one in Settings, or use the event type filters.'
          : msg,
      )
      setSearchResults(null)
    } finally {
      setSearching(false)
    }
  }, [agentId, searchQuery])

  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setSearchResults(null)
    setSearchError(null)
  }, [])

  const refresh = useCallback(async () => {
    setPage(1)
    await fetchEvents(1, false, filterType)
  }, [fetchEvents, filterType])

  return {
    events,
    displayEvents: searchResults ?? events,
    loading,
    error,
    hasMore,
    filterType,
    searchQuery,
    searching,
    searchResults,
    searchError,
    setSearchQuery,
    applyFilter,
    runSearch,
    clearSearch,
    loadMore,
    refresh,
  }
}
