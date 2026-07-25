'use client'

import { colors, radii } from '@/lib/design-tokens'
import { eventColor, topN } from '@/lib/events'

function Bar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <span className="text-xs font-mono truncate" style={{ color: colors.text }} title={label}>
          {label}
        </span>
        <span className="text-xs font-mono shrink-0" style={{ color: colors.textMuted }}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-1.5 rounded overflow-hidden" style={{ background: colors.bg }}>
        <div
          className="h-full rounded"
          style={{ width: `${Math.min(pct, 100)}%`, background: color, opacity: 0.8 }}
        />
      </div>
    </div>
  )
}

/**
 * Event-type distribution (colored by `eventColor`) and top parent→child
 * transitions, as horizontal bars. Reuses the BehaviorPanel visual idiom.
 */
export function DistributionBars({
  distribution,
  transitions,
}: {
  distribution: Record<string, number>
  transitions: Record<string, number>
}) {
  const events = topN(distribution, 8)
  const trans = topN(transitions, 6)

  return (
    <div
      className="p-4"
      style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg }}
    >
      <h3 className="text-sm font-medium mb-3" style={{ color: colors.textStrong }}>
        Event breakdown
      </h3>

      {events.length === 0 ? (
        <p className="text-sm" style={{ color: colors.textMuted }}>
          No events in this period.
        </p>
      ) : (
        <div className="space-y-2">
          {events.map(([type, pct]) => (
            <Bar key={type} label={type} pct={pct} color={eventColor(type)} />
          ))}
        </div>
      )}

      {trans.length > 0 && (
        <>
          <h4 className="text-xs font-medium mt-5 mb-2" style={{ color: colors.textMuted }}>
            Common decision sequences (parent → child)
          </h4>
          <div className="space-y-2">
            {trans.map(([key, pct]) => (
              <Bar key={key} label={key} pct={pct} color={colors.info} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
