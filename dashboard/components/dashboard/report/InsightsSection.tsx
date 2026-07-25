'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react'
import { colors, radii } from '@/lib/design-tokens'
import type { ReportRecommendation, ReportSeverity } from '@/lib/api'
import { Recommendations } from './Recommendations'

const SEVERITY_LABEL: Record<ReportSeverity, string> = {
  critical: 'critical',
  warning: 'warning',
  info: 'info',
  positive: 'all clear',
}

/** "1 critical · 2 info" — a compact header summary from the same list. */
function summarize(items: ReportRecommendation[]): string {
  const order: ReportSeverity[] = ['critical', 'warning', 'info', 'positive']
  const counts = new Map<ReportSeverity, number>()
  for (const r of items) counts.set(r.severity, (counts.get(r.severity) ?? 0) + 1)
  const parts = order
    .filter((s) => counts.get(s))
    .map((s) => `${counts.get(s)} ${SEVERITY_LABEL[s]}`)
  return parts.join(' · ')
}

/**
 * Recommendations, tucked into a collapsible "Insights" block so they don't
 * compete with the core metrics. Collapsed on screen (the header summarizes
 * severity); the `.report-insights` class force-expands it in the print
 * stylesheet, so the PDF always contains the full list. Deliberately modest —
 * the Suggestions tab will be the home for richer, automated suggestions.
 */
export function InsightsSection({ items }: { items: ReportRecommendation[] }) {
  const [open, setOpen] = useState(false)
  if (items.length === 0) return null

  return (
    <section
      className="report-insights"
      style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="report-insights__toggle btn-hover w-full flex items-center gap-2.5 px-4 py-3 text-left"
        style={{ color: colors.text, borderRadius: radii.lg }}
      >
        <Sparkles size={15} style={{ color: colors.info }} className="shrink-0" />
        <span className="text-sm font-medium" style={{ color: colors.textStrong }}>
          Insights
        </span>
        <span className="text-xs" style={{ color: colors.textMuted }}>
          {summarize(items)}
        </span>
        <span className="ml-auto shrink-0" style={{ color: colors.textMuted }}>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>

      <div className="report-insights__body" hidden={!open}>
        <div className="px-4 pb-4">
          <Recommendations items={items} heading={null} />
          <p className="text-xs mt-3" style={{ color: colors.textFaint }}>
            Deeper, automated suggestions are coming to the Suggestions tab.
          </p>
        </div>
      </div>
    </section>
  )
}
