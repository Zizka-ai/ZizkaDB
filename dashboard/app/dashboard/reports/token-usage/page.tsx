'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui'
import { ReportToolbar } from '@/components/dashboard/report/ReportToolbar'
import { ReportsSubTabs } from '@/components/dashboard/report/ReportsSubTabs'
import { TokenUsageView } from '@/components/dashboard/token-usage/TokenUsageView'
import { useAgents } from '@/hooks/useAgents'
import { useSelectedAgent } from '@/hooks/useSelectedAgent'
import { useAgentTokenUsage } from '@/hooks/useAgentTokenUsage'
import { hasAnyData } from '@/lib/token-usage'
import {
  PERIOD_OPTIONS,
  isPeriodType,
  resolveTokenUsageRange,
  type PeriodType,
  type ResolvedTokenUsageRange,
} from '@/lib/report'
import { colors, radii } from '@/lib/design-tokens'

function TokenUsageContent() {
  const { agents, loading: agentsLoading, error: agentsError } = useAgents()
  const { agentId, invalidAgent } = useSelectedAgent(agents)

  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const urlPeriod = params.get('period')
  const [period, setPeriod] = useState<PeriodType>(isPeriodType(urlPeriod) ? urlPeriod : 'monthly')
  const [custom, setCustom] = useState({ from: params.get('from') ?? '', to: params.get('to') ?? '' })

  // Pinned like Reports Overview — rolling windows resolve immediately, custom
  // waits for Generate — so switching periods doesn't cause a refetch loop.
  const [range, setRange] = useState<ResolvedTokenUsageRange | null>(null)

  const agentQuery = agentId ? `?agent=${encodeURIComponent(agentId)}` : ''

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

  useEffect(() => {
    if (period !== 'custom') setRange(resolveTokenUsageRange(period))
  }, [period])

  const onPeriodChange = (p: PeriodType) => {
    setPeriod(p)
    syncUrl(p, custom)
  }
  const onGenerateCustom = () => {
    setRange(resolveTokenUsageRange('custom', custom))
    syncUrl('custom', custom)
  }

  const { usage, loading, refreshing, error, refetch } = useAgentTokenUsage(agentId, range)

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
        <ReportsSubTabs active="token-usage" agentQuery={agentQuery} />
        <EmptyState
          title="No agents yet"
          description="Token usage is aggregated per agent from recorded events. Once an agent starts logging, its report appears here."
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Reports"
        description="Token and cost usage aggregated from events carrying a token_usage field."
      />

      <ReportsSubTabs active="token-usage" agentQuery={agentQuery} />

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
        canExport={!!usage && !loading}
        refreshing={refreshing}
        showExport={false}
        periodLabel="Usage period"
      />

      {loading ? (
        <Skeleton rows={8} />
      ) : error ? (
        <ErrorState message={error} />
      ) : usage && hasAnyData(usage) ? (
        <TokenUsageView usage={usage} periodLabel={periodLabel} />
      ) : (
        <EmptyState
          title="No token usage data yet"
          description="Log events with a token_usage field in their data payload to see this report. See docs for the event schema."
        />
      )}
    </>
  )
}

export default function TokenUsagePage() {
  // useSelectedAgent / useSearchParams require a Suspense boundary (CSR bailout).
  return (
    <Suspense fallback={<Skeleton rows={6} />}>
      <TokenUsageContent />
    </Suspense>
  )
}
