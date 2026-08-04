'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui'
import { ReportToolbar } from '@/components/dashboard/report/ReportToolbar'
import { SuggestionsSubTabs } from '@/components/dashboard/suggestions/SuggestionsSubTabs'
import { TokenOptimizationSummary } from '@/components/dashboard/token-optimization/TokenOptimizationSummary'
import { TokenOptimizationList } from '@/components/dashboard/token-optimization/TokenOptimizationList'
import { useAgents } from '@/hooks/useAgents'
import { useSelectedAgent } from '@/hooks/useSelectedAgent'
import { useAgentTokenOptimization } from '@/hooks/useAgentTokenOptimization'
import {
  isPeriodType,
  resolveTokenUsageRange,
  validateCustomRange,
  type PeriodType,
  type ResolvedTokenUsageRange,
} from '@/lib/report'
import { colors, radii } from '@/lib/design-tokens'

function TokenOptimizationContent() {
  const { agents, loading: agentsLoading, error: agentsError } = useAgents()
  const { agentId, invalidAgent } = useSelectedAgent(agents)

  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const urlPeriod = params.get('period')
  const [period, setPeriod] = useState<PeriodType>(isPeriodType(urlPeriod) ? urlPeriod : 'monthly')
  const [custom, setCustom] = useState({ from: params.get('from') ?? '', to: params.get('to') ?? '' })

  // Pinned like Reports Overview / Token Usage — rolling windows resolve
  // immediately, custom waits for Generate — so switching periods doesn't
  // cause a refetch loop.
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

  // Resolve rolling periods immediately; custom waits for Generate — unless
  // we landed here via a deep link that already carries a valid `from`/`to`,
  // in which case the range should resolve automatically rather than
  // showing an empty state until the user re-picks the same dates.
  useEffect(() => {
    if (period !== 'custom') setRange(resolveTokenUsageRange(period))
    else if (!validateCustomRange(custom.from, custom.to)) setRange(resolveTokenUsageRange('custom', custom))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period])

  const onPeriodChange = (p: PeriodType) => {
    setPeriod(p)
    syncUrl(p, custom)
  }
  const onGenerateCustom = () => {
    setRange(resolveTokenUsageRange('custom', custom))
    syncUrl('custom', custom)
  }

  const { result, loading, refreshing, error, refetch } = useAgentTokenOptimization(agentId, range)

  if (agentsLoading) return <Skeleton rows={6} />
  if (agentsError) return <ErrorState message={agentsError} />

  if (agents.length === 0) {
    return (
      <>
        <PageHeader title="Suggestions" />
        <SuggestionsSubTabs active="token-optimization" agentQuery={agentQuery} />
        <EmptyState
          title="No agents yet"
          description="Token optimization suggestions are computed per agent from recorded token usage. Once an agent starts logging, recommendations appear here."
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Suggestions"
        description="Deterministic token-cost optimization opportunities computed from real usage — no AI, no estimates."
      />

      <SuggestionsSubTabs active="token-optimization" agentQuery={agentQuery} />

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
        canExport={!!result && !loading}
        refreshing={refreshing}
        showExport={false}
        showRegenerate={true}
        periodLabel="Analysis period"
      />

      {loading ? (
        <Skeleton rows={8} />
      ) : error ? (
        <ErrorState message={error} />
      ) : result && result.status === 'ok' && result.suggestions.length > 0 ? (
        <div className="space-y-6" style={{ opacity: refreshing ? 0.6 : 1, transition: 'opacity 150ms' }}>
          <TokenOptimizationSummary result={result} />
          <TokenOptimizationList suggestions={result.suggestions} />
        </div>
      ) : (
        <EmptyState
          title="No optimization opportunities found"
          description="Either this agent has no token_usage data in this period, or its usage doesn't cross any of the detection thresholds — often a sign it's already running efficiently. Widen the period or check back after more runs."
        />
      )}
    </>
  )
}

export default function TokenOptimizationPage() {
  // useSelectedAgent / useSearchParams require a Suspense boundary (CSR bailout).
  return (
    <Suspense fallback={<Skeleton rows={6} />}>
      <TokenOptimizationContent />
    </Suspense>
  )
}
