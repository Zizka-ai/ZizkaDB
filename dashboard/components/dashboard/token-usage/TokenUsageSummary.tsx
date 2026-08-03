'use client'

import { Info } from 'lucide-react'
import { colors } from '@/lib/design-tokens'
import { formatCost, formatTokens } from '@/lib/token-usage'
import type { TokenUsagePayload } from '@/lib/api'
import { KpiCard } from '@/components/dashboard/report/KpiCard'

/**
 * KPI row for the Token Usage report. Cached/Reasoning tiles only render when
 * the aggregate has at least one non-zero value across the range — providers
 * that never report them (e.g. no prompt caching, no reasoning tokens) don't
 * get a permanent, meaningless "0" tile.
 *
 * Every number here traces directly to a `totals.*` field returned by
 * `GET /v1/agents/{id}/token-usage` — nothing here is estimated or hardcoded.
 */
export function TokenUsageSummary({ usage }: { usage: TokenUsagePayload }) {
  const t = usage.totals
  const hasCached = t.cached_tokens > 0
  const hasReasoning = t.reasoning_tokens > 0
  const hasUnpriced = usage.unpriced_models.length > 0

  const kpis: Array<{
    label: string
    value: string
    footnote?: string
    titleAttr?: string
  }> = [
    { label: 'Total tokens', value: formatTokens(t.total_tokens) },
    { label: 'Input tokens', value: formatTokens(t.input_tokens) },
    { label: 'Output tokens', value: formatTokens(t.output_tokens) },
  ]
  if (hasCached) kpis.push({ label: 'Cached tokens', value: formatTokens(t.cached_tokens) })
  if (hasReasoning) kpis.push({ label: 'Reasoning tokens', value: formatTokens(t.reasoning_tokens) })
  kpis.push({
    label: 'Total cost',
    value: formatCost(t.total_cost),
    footnote: hasUnpriced
      ? `Cost excludes ${usage.unpriced_models.length} model(s) without pricing data — see below`
      : undefined,
  })
  kpis.push({ label: 'Requests', value: formatTokens(t.total_requests) })
  kpis.push({ label: 'Avg tokens / request', value: formatTokens(t.avg_tokens_per_request) })
  kpis.push({
    label: 'Success rate',
    value: `${t.success_rate_pct}%`,
    footnote: `${formatTokens(t.success_count)} ok · ${formatTokens(t.failed_count)} failed`,
  })

  return (
    <section>
      {hasUnpriced && (
        <div
          className="flex items-start gap-2 mb-3 px-3 py-2 text-xs"
          role="status"
          style={{ background: colors.warningBg, border: `1px solid ${colors.warning}40`, borderRadius: 8 }}
        >
          <Info size={14} className="mt-0.5 shrink-0" style={{ color: colors.warning }} />
          <span style={{ color: colors.warning }}>
            Cost not available for {usage.unpriced_models.length} model(s):{' '}
            {usage.unpriced_models.join(', ')}. Token counts are still accurate.
          </span>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} footnote={k.footnote} />
        ))}
      </div>
    </section>
  )
}
