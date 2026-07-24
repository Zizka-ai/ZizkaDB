'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui'
import { ReportToolbar } from '@/components/dashboard/report/ReportToolbar'
import { ReportView } from '@/components/dashboard/report/ReportView'
import { useAgents } from '@/hooks/useAgents'
import { useSelectedAgent } from '@/hooks/useSelectedAgent'
import { useAgentReport } from '@/hooks/useAgentReport'
import {
  PERIOD_OPTIONS,
  isPeriodType,
  resolveRange,
  type PeriodType,
  type ResolvedRange,
} from '@/lib/report'
import { colors, radii } from '@/lib/design-tokens'

function ReportsContent() {
  const { agents, loading: agentsLoading, error: agentsError } = useAgents()
  const { agentId, invalidAgent } = useSelectedAgent(agents)

  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const urlPeriod = params.get('period')
  const [period, setPeriod] = useState<PeriodType>(isPeriodType(urlPeriod) ? urlPeriod : 'monthly')
  const [custom, setCustom] = useState({ from: params.get('from') ?? '', to: params.get('to') ?? '' })

  // The resolved range is pinned when the period changes / Generate is pressed —
  // not recomputed every render — so rolling windows don't trigger a refetch loop.
  const [range, setRange] = useState<ResolvedRange | null>(null)

  const syncUrl = useCallback(
    (p: PeriodType, c: { from: string; to: string }) => {
      const next = new URLSearchParams(params.toString())
      next.set('period', p)
      if (p === 'custom') {
        if (c.from) next.set('from', c.from)
        if (c.to) next.set('to', c.to)
      } else {
        next.delete('from')
        next.delete('to')
      }
      router.replace(`${pathname}?${next.toString()}`)
    },
    [params, pathname, router],
  )

  // Resolve rolling periods immediately; custom waits for Generate.
  useEffect(() => {
    if (period !== 'custom') setRange(resolveRange(period))
  }, [period])

  const onPeriodChange = (p: PeriodType) => {
    setPeriod(p)
    syncUrl(p, custom)
  }
  const onGenerateCustom = () => {
    setRange(resolveRange('custom', custom))
    syncUrl('custom', custom)
  }

  const { report, loading, refreshing, error, refetch } = useAgentReport(agentId, range)

  const periodLabel = useMemo(
    () => PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? '',
    [period],
  )

  if (agentsLoading) return <Skeleton rows={6} />
  if (agentsError) return <ErrorState message={agentsError} />

  if (agents.length === 0) {
    return (
      <>
        <PageHeader title="Reports" />
        <EmptyState
          title="No agents yet"
          description="Reports are generated per agent from recorded events. Once an agent starts logging, its report appears here."
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Reports"
        description="Executive-ready summaries of an agent's activity, health and behavior."
      />

      {invalidAgent && (
        <div
          className="mb-4 px-3 py-2.5 text-sm"
          role="status"
          style={{
            background: colors.warningBg,
            border: `1px solid ${colors.warning}40`,
            borderRadius: radii.md,
            color: colors.warning,
          }}
        >
          That agent no longer exists. Showing <span className="font-mono">{agentId}</span> instead.
        </div>
      )}

      <ReportToolbar
        period={period}
        onPeriodChange={onPeriodChange}
        custom={custom}
        onCustomChange={setCustom}
        onGenerateCustom={onGenerateCustom}
        onRegenerate={refetch}
        onPrint={() => window.print()}
        canExport={!!report && !loading}
        refreshing={refreshing}
      />

      {loading ? (
        <Skeleton rows={8} />
      ) : error ? (
        <ErrorState message={error} />
      ) : report ? (
        <ReportView report={report} periodLabel={periodLabel} />
      ) : null}
    </>
  )
}

export default function ReportsPage() {
  // useSelectedAgent / useSearchParams require a Suspense boundary (CSR bailout).
  return (
    <Suspense fallback={<Skeleton rows={6} />}>
      <ReportsContent />
    </Suspense>
  )
}
