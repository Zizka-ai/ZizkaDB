'use client'

import { useMemo } from 'react'
import { colors, radii } from '@/lib/design-tokens'
import { formatUtcMonthDay, utcDay } from '@/lib/report'
import type { ReportBucket } from '@/lib/api'

const W = 800
const H = 220
const PAD = { top: 16, right: 12, bottom: 28, left: 40 }

/**
 * Events (area) + errors (line) per bucket. Hand-rolled inline SVG — no chart
 * library. Uses a fixed viewBox so it scales fluidly. Handles the empty,
 * single-point and all-zero cases without producing NaN geometry, and ships a
 * visually-hidden data table so the trend is accessible and prints legibly.
 */
export function TrendChart({
  buckets,
  granularity,
}: {
  buckets: ReportBucket[]
  granularity: 'day' | 'week'
}) {
  const geom = useMemo(() => {
    const n = buckets.length
    const maxY = Math.max(1, ...buckets.map((b) => b.events))
    const innerW = W - PAD.left - PAD.right
    const innerH = H - PAD.top - PAD.bottom
    // With a single bucket, place it in the middle so it isn't a zero-width line.
    const x = (i: number) => (n <= 1 ? PAD.left + innerW / 2 : PAD.left + (i / (n - 1)) * innerW)
    const y = (v: number) => PAD.top + innerH - (v / maxY) * innerH
    const pts = buckets.map((b, i) => ({ x: x(i), ye: y(b.events), yr: y(b.errors), b }))
    return { pts, maxY, baseY: PAD.top + innerH }
  }, [buckets])

  const hasData = buckets.some((b) => b.events > 0)

  const eventsPath = geom.pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.ye}`).join(' ')
  const areaPath =
    geom.pts.length > 0
      ? `${eventsPath} L${geom.pts[geom.pts.length - 1].x},${geom.baseY} L${geom.pts[0].x},${geom.baseY} Z`
      : ''
  const errorsPath = geom.pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.yr}`).join(' ')

  return (
    <div
      style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg }}
      className="p-4"
    >
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h3 className="text-sm font-medium" style={{ color: colors.textStrong }}>
          Activity trend
        </h3>
        <div className="flex items-center gap-4 text-xs" style={{ color: colors.textMuted }}>
          <span className="inline-flex items-center gap-1.5">
            <span style={{ width: 10, height: 10, borderRadius: 2, background: colors.info }} />
            Events
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span style={{ width: 10, height: 2, background: colors.danger }} />
            Errors
          </span>
        </div>
      </div>

      {!hasData ? (
        <p className="text-sm py-8 text-center" style={{ color: colors.textMuted }}>
          No activity in this period.
        </p>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={`Activity trend: ${buckets.length} ${granularity} buckets, peak ${geom.maxY} events`}
          preserveAspectRatio="none"
        >
          {/* Y gridline (max) */}
          <line x1={PAD.left} y1={PAD.top} x2={W - PAD.right} y2={PAD.top} stroke={colors.border} />
          <text x={PAD.left - 6} y={PAD.top + 4} textAnchor="end" fontSize="11" fill={colors.textFaint}>
            {geom.maxY}
          </text>
          <text x={PAD.left - 6} y={geom.baseY + 4} textAnchor="end" fontSize="11" fill={colors.textFaint}>
            0
          </text>

          {areaPath && <path d={areaPath} fill={colors.info} fillOpacity={0.15} />}
          {eventsPath && <path d={eventsPath} fill="none" stroke={colors.info} strokeWidth={2} />}
          {errorsPath && <path d={errorsPath} fill="none" stroke={colors.danger} strokeWidth={1.5} />}

          {/* Single-point markers so one bucket still shows */}
          {geom.pts.length === 1 && (
            <>
              <circle cx={geom.pts[0].x} cy={geom.pts[0].ye} r={3} fill={colors.info} />
              <circle cx={geom.pts[0].x} cy={geom.pts[0].yr} r={3} fill={colors.danger} />
            </>
          )}

          {/* X labels: first & last */}
          <text x={PAD.left} y={H - 8} fontSize="11" fill={colors.textFaint}>
            {formatUtcMonthDay(buckets[0].bucket)}
          </text>
          <text x={W - PAD.right} y={H - 8} textAnchor="end" fontSize="11" fill={colors.textFaint}>
            {formatUtcMonthDay(buckets[buckets.length - 1].bucket)}
          </text>
        </svg>
      )}

      {/* Accessible / printable data table */}
      <table className="sr-only">
        <caption>Activity per {granularity}</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Events</th>
            <th>Errors</th>
            <th>Sessions</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.bucket}>
              <td>{utcDay(b.bucket)}</td>
              <td>{b.events}</td>
              <td>{b.errors}</td>
              <td>{b.sessions}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
