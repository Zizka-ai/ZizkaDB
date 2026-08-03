'use client'

import { colors } from '@/lib/design-tokens'
import { formatUtcDate, formatUtcDateTime } from '@/lib/report'
import type { TokenUsagePayload } from '@/lib/api'
import { TokenUsageSummary } from './TokenUsageSummary'
import { TokenUsageTrendChart } from './TokenUsageTrendChart'
import { TokenUsageBreakdown } from './TokenUsageBreakdown'
import { TokenUsageTopConsumers } from './TokenUsageTopConsumers'

/**
 * Top-down composition for the Token Usage tab, mirroring report/ReportView's
 * structure: summary KPIs → trend → breakdown → top consumers.
 */
export function TokenUsageView({
  usage,
  periodLabel,
}: {
  usage: TokenUsagePayload
  periodLabel: string
}) {
  const p = usage.period
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold" style={{ color: colors.textStrong }}>
          {usage.agent}
        </h2>
        <p className="text-xs mt-0.5" style={{ color: colors.textFaint }}>
          {periodLabel} · {formatUtcDate(p.from)} – {formatUtcDate(p.to)} (UTC) · generated{' '}
          {formatUtcDateTime(usage.generated_at)} UTC
        </p>
      </div>

      <TokenUsageSummary usage={usage} />

      <TokenUsageTrendChart points={usage.trend} granularity={p.granularity} />

      <TokenUsageBreakdown usage={usage} />

      <TokenUsageTopConsumers usage={usage} />

      <p className="text-xs pt-2" style={{ color: colors.textFaint }}>
        Aggregated from events with a <code>token_usage</code> field · all times UTC
      </p>
    </div>
  )
}
