'use client'

import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { colors, radii } from '@/lib/design-tokens'
import type { ReportRecommendation, ReportSeverity } from '@/lib/api'

const SEVERITY: Record<
  ReportSeverity,
  { color: string; bg: string; icon: typeof Info; rank: number }
> = {
  critical: { color: colors.danger, bg: colors.dangerBg, icon: XCircle, rank: 0 },
  warning: { color: colors.warning, bg: colors.warningBg, icon: AlertTriangle, rank: 1 },
  info: { color: colors.info, bg: colors.infoBg, icon: Info, rank: 2 },
  positive: { color: colors.success, bg: colors.successBg, icon: CheckCircle2, rank: 3 },
}

/**
 * Rule-based recommendations, most severe first. Each is deterministic and
 * derived from the report's real metrics (see services/reports.py).
 */
export function Recommendations({ items }: { items: ReportRecommendation[] }) {
  const sorted = [...items].sort((a, b) => SEVERITY[a.severity].rank - SEVERITY[b.severity].rank)

  return (
    <div>
      <h3 className="text-sm font-medium mb-3" style={{ color: colors.textStrong }}>
        Recommendations
      </h3>
      <div className="space-y-2">
        {sorted.map((r, i) => {
          const s = SEVERITY[r.severity]
          const Icon = s.icon
          return (
            <div
              key={`${r.category}-${i}`}
              className="flex items-start gap-3 p-3"
              style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.lg,
                borderLeft: `3px solid ${s.color}`,
              }}
            >
              <Icon size={16} style={{ color: s.color }} className="mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium" style={{ color: colors.textStrong }}>
                    {r.title}
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded uppercase tracking-wide"
                    style={{ background: s.bg, color: s.color }}
                  >
                    {r.category}
                  </span>
                </div>
                <p className="text-sm mt-0.5" style={{ color: colors.textMuted }}>
                  {r.detail}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
