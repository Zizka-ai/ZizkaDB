'use client'

import { StatusBadge } from '@/components/ui'
import { colors } from '@/lib/design-tokens'
import { formatNumber } from '@/lib/report'
import type { ReportSummary } from '@/lib/api'
import { KpiCard } from './KpiCard'

const HIGHLIGHT: Record<ReportSummary['health'], string> = {
  healthy: 'This agent is healthy for the period — low errors and consistent behavior.',
  attention: 'This agent needs attention — errors or behavior are trending the wrong way.',
  idle: 'No activity was recorded for this agent in the selected period.',
  drift: 'This agent is drifting from its established baseline — review the changes below.',
  error: 'This agent has a high error rate for the period — investigate reliability.',
}

/** Health verdict + highlight sentence + the KPI grid with period deltas. */
export function ExecutiveSummary({ summary }: { summary: ReportSummary }) {
  const s = summary
  const kpis = [
    {
      label: 'Total events',
      value: formatNumber(s.total_events),
      current: s.total_events,
      previous: s.previous.total_events,
      goodDirection: 'up' as const,
    },
    {
      label: 'Error rate',
      value: `${s.error_rate_pct}%`,
      current: s.error_rate_pct,
      previous: s.previous.error_rate_pct,
      goodDirection: 'down' as const,
      footnote: `${formatNumber(s.error_count)} error events`,
    },
    {
      label: 'Sessions',
      value: formatNumber(s.sessions),
      current: s.sessions,
      previous: s.previous.sessions,
      goodDirection: 'up' as const,
    },
    {
      label: 'Event types',
      value: formatNumber(s.unique_event_types),
      goodDirection: 'neutral' as const,
    },
    {
      label: 'Active days',
      value: formatNumber(s.active_days),
      goodDirection: 'neutral' as const,
    },
  ]

  return (
    <section>
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <StatusBadge tone={s.health} />
        <p className="text-sm" style={{ color: colors.textMuted }}>
          {HIGHLIGHT[s.health]}
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>
    </section>
  )
}
