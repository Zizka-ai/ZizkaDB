'use client'

import { Info } from 'lucide-react'
import { colors } from '@/lib/design-tokens'
import { formatSavings } from '@/lib/token-optimization'
import type { TokenOptimizationResult } from '@/lib/api'
import { KpiCard } from '@/components/dashboard/report/KpiCard'

/**
 * KPI row for the Token Optimization tab. Mirrors token-usage/TokenUsageSummary's
 * structure. Every number traces directly to an `aggregates.*` field returned
 * by `GET /v1/agents/{id}/token-optimization` — nothing here is estimated or
 * hardcoded (this whole feature is deterministic, no LLM call).
 */
export function TokenOptimizationSummary({ result }: { result: TokenOptimizationResult }) {
  const a = result.aggregates
  const hasUnpriced = result.unpriced_models.length > 0

  const kpis: Array<{ label: string; value: string; footnote?: string }> = [
    { label: 'Potential monthly savings', value: formatSavings(a.total_potential_monthly_savings_usd) },
    { label: 'Cost reduction potential', value: `${a.cost_reduction_pct.toFixed(0)}%` },
    { label: 'Optimization score', value: `${a.optimization_score}/100` },
    { label: 'Recommendations', value: `${a.suggestion_count}` },
    {
      label: 'Critical',
      value: `${a.critical_count}`,
      footnote: a.critical_count > 0 ? 'Address these first' : undefined,
    },
  ]

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
            Savings estimates exclude {result.unpriced_models.length} model(s) without pricing data:{' '}
            {result.unpriced_models.join(', ')}.
          </span>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} footnote={k.footnote} />
        ))}
      </div>
    </section>
  )
}
