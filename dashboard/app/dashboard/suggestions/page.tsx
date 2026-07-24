'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { KeyRound, Sparkles } from 'lucide-react'
import { EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui'
import { SuggestionsToolbar } from '@/components/dashboard/suggestions/SuggestionsToolbar'
import { SuggestionList } from '@/components/dashboard/suggestions/SuggestionList'
import { useAgents } from '@/hooks/useAgents'
import { useSelectedAgent } from '@/hooks/useSelectedAgent'
import { useAgentSuggestions } from '@/hooks/useAgentSuggestions'
import { isPeriodType, resolveRange, type PeriodType, type ResolvedRange } from '@/lib/report'
import { colors, radii } from '@/lib/design-tokens'
import type { SuggestionsResult } from '@/lib/api'

function SuggestionsContent() {
  const { agents, loading: agentsLoading, error: agentsError } = useAgents()
  const { agentId, invalidAgent } = useSelectedAgent(agents)

  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const urlPeriod = params.get('period')
  const [period, setPeriod] = useState<PeriodType>(isPeriodType(urlPeriod) ? urlPeriod : 'monthly')
  const [custom, setCustom] = useState({ from: params.get('from') ?? '', to: params.get('to') ?? '' })
  // Pin the resolved range when the period changes / Analyze is pressed — so a
  // rolling window doesn't trigger a refetch loop (matches Reports).
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

  const { result, loading, refreshing, error, refetch } = useAgentSuggestions(agentId, range)

  if (agentsLoading) return <Skeleton rows={6} />
  if (agentsError) return <ErrorState message={agentsError} />

  if (agents.length === 0) {
    return (
      <>
        <PageHeader title="Suggestions" />
        <EmptyState
          title="No agents yet"
          description="Suggestions are generated per agent from recorded behavior. Once an agent starts logging events, evidence-backed recommendations appear here."
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Suggestions"
        description="AI recommendations grounded in your agent's real recorded behavior — never invented."
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

      <SuggestionsToolbar
        period={period}
        onPeriodChange={onPeriodChange}
        custom={custom}
        onCustomChange={setCustom}
        onGenerateCustom={onGenerateCustom}
        onRegenerate={refetch}
        canRegenerate={result?.status === 'ok'}
        refreshing={refreshing}
      />

      {loading ? (
        <Skeleton rows={8} />
      ) : error ? (
        <ErrorState message={error} />
      ) : result ? (
        <ResultBody result={result} refreshing={refreshing} />
      ) : null}
    </>
  )
}

function ResultBody({ result, refreshing }: { result: SuggestionsResult; refreshing: boolean }) {
  if (result.status === 'ai_not_configured') {
    return (
      <EmptyState
        icon={<KeyRound size={22} style={{ color: colors.textFaint }} />}
        title="AI analysis not configured"
        description="Suggestions use the Claude API. Set ANTHROPIC_API_KEY on your ZizkaDB server to enable AI-generated recommendations. Everything else in the dashboard keeps working without it."
      />
    )
  }

  if (result.status === 'no_evidence' || result.suggestions.length === 0) {
    return (
      <EmptyState
        icon={<Sparkles size={22} style={{ color: colors.textFaint }} />}
        title="Not enough signal yet"
        description="This agent hasn't produced enough recorded activity in this window to support evidence-backed suggestions — often a sign it's running cleanly. Widen the period or check back after more runs."
      />
    )
  }

  return (
    <div style={{ opacity: refreshing ? 0.6 : 1, transition: 'opacity 150ms' }}>
      <SuggestionList suggestions={result.suggestions} evidence={result.evidence} />
    </div>
  )
}

export default function SuggestionsPage() {
  // useSelectedAgent / useSearchParams require a Suspense boundary (CSR bailout).
  return (
    <Suspense fallback={<Skeleton rows={6} />}>
      <SuggestionsContent />
    </Suspense>
  )
}
