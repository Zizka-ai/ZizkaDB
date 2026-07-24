'use client'

import { useCallback, useEffect, useState } from 'react'
import { getAgentReport, type ReportGranularity, type ReportPayload } from '@/lib/api'
import { getToken } from '@/lib/auth'

export interface AgentReportState {
  report: ReportPayload | null
  loading: boolean // true only on the first load / agent+range change
  refreshing: boolean // true during a regenerate (keeps the old report visible)
  error: string | null
  refetch: () => void
}

/**
 * Fetch the consolidated report for an agent over a date range.
 *
 * - A change of agent or range does a fresh load (skeleton).
 * - `refetch()` regenerates in place: the current report stays visible with a
 *   `refreshing` flag, so there's no blank flash.
 * - Responses are guarded against agent/range changes mid-flight, so a slow
 *   response for a previous range can never overwrite the current one.
 */
export function useAgentReport(
  agentId: string | null,
  range: { from: string; to: string; granularity: ReportGranularity } | null,
): AgentReportState {
  const [report, setReport] = useState<ReportPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  const key = agentId && range ? `${agentId}|${range.from}|${range.to}|${range.granularity}` : null

  useEffect(() => {
    if (!agentId || !range) {
      setReport(null)
      setLoading(false)
      return
    }
    const token = getToken()
    if (!token) return

    let cancelled = false
    const isRegen = nonce > 0
    // Keep the existing report on a regenerate; only blank-load on a new key.
    if (isRegen && report) setRefreshing(true)
    else setLoading(true)
    setError(null)

    getAgentReport(token, agentId, range)
      .then((res) => {
        if (cancelled) return
        setReport(res)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to generate report')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
        setRefreshing(false)
      })

    return () => {
      cancelled = true
    }
    // `key` captures agent + range; `nonce` drives regenerate. `report` is read
    // but intentionally not a trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce])

  const refetch = useCallback(() => setNonce((n) => n + 1), [])

  return { report, loading, refreshing, error, refetch }
}
