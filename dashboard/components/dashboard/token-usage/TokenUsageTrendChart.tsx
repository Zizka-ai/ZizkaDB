'use client'

import { useMemo } from 'react'
import { colors, radii } from '@/lib/design-tokens'
import { formatUtcMonthDay, formatUtcMonthDayTime, utcDay } from '@/lib/report'
import { formatTokens } from '@/lib/token-usage'
import type { TokenUsageGranularity, TokenUsageTrendPoint } from '@/lib/api'

const W = 800
const H = 220
const PAD = { top: 16, right: 12, bottom: 28, left: 44 }

/**
 * Input vs output tokens per bucket, stacked area. Adapts report/TrendChart's
 * inline-SVG approach: fixed viewBox, sr-only data table, and the same
 * empty/single-point/all-zero handling so the chart never produces NaN
 * geometry or a blank-looking frame when there's no activity.
 */
export function TokenUsageTrendChart({
  points,
  granularity,
}: {
  points: TokenUsageTrendPoint[]
  granularity: TokenUsageGranularity
}) {
  const geom = useMemo(() => {
    const n = points.length
    const maxY = Math.max(1, ...points.map((p) => p.input_tokens + p.output_tokens))
    const innerW = W - PAD.left - PAD.right
    const innerH = H - PAD.top - PAD.bottom
    const x = (i: number) => (n <= 1 ? PAD.left + innerW / 2 : PAD.left + (i / (n - 1)) * innerW)
    const y = (v: number) => PAD.top + innerH - (v / maxY) * innerH
    const pts = points.map((p, i) => ({
      x: x(i),
      yInput: y(p.input_tokens),
      yTotal: y(p.input_tokens + p.output_tokens),
      p,
    }))
    return { pts, maxY, baseY: PAD.top + innerH }
  }, [points])

  const hasData = points.some((p) => p.tokens > 0)
  const formatLabel = granularity === 'hour' ? formatUtcMonthDayTime : formatUtcMonthDay

  const inputPath = geom.pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.yInput}`).join(' ')
  const inputArea =
    geom.pts.length > 0
      ? `${inputPath} L${geom.pts[geom.pts.length - 1].x},${geom.baseY} L${geom.pts[0].x},${geom.baseY} Z`
      : ''
  const totalPath = geom.pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.yTotal}`).join(' ')
  const totalArea =
    geom.pts.length > 0
      ? `${totalPath} L${geom.pts[geom.pts.length - 1].x},${geom.pts[geom.pts.length - 1].yInput} ` +
        geom.pts
          .slice()
          .reverse()
          .map((p) => `L${p.x},${p.yInput}`)
          .join(' ') +
        ' Z'
      : ''

  return (
    <div
      style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg }}
      className="p-4"
    >
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h3 className="text-sm font-medium" style={{ color: colors.textStrong }}>
          Token usage trend
        </h3>
        <div className="flex items-center gap-4 text-xs" style={{ color: colors.textMuted }}>
          <span className="inline-flex items-center gap-1.5">
            <span style={{ width: 10, height: 10, borderRadius: 2, background: colors.info }} />
            Input tokens
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span style={{ width: 10, height: 10, borderRadius: 2, background: colors.success }} />
            Output tokens
          </span>
        </div>
      </div>

      {points.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: colors.textMuted }}>
          No data for this period.
        </p>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={
            hasData
              ? `Token usage trend: ${points.length} ${granularity} buckets, peak ${formatTokens(geom.maxY)} tokens`
              : `Token usage trend: no activity across ${points.length} ${granularity} buckets`
          }
          preserveAspectRatio="none"
        >
          <line x1={PAD.left} y1={PAD.top} x2={W - PAD.right} y2={PAD.top} stroke={colors.border} />
          <text x={PAD.left - 6} y={PAD.top + 4} textAnchor="end" fontSize="11" fill={colors.textFaint}>
            {formatTokens(geom.maxY)}
          </text>
          <text x={PAD.left - 6} y={geom.baseY + 4} textAnchor="end" fontSize="11" fill={colors.textFaint}>
            0
          </text>

          {inputArea && <path d={inputArea} fill={colors.info} fillOpacity={0.25} />}
          {totalArea && <path d={totalArea} fill={colors.success} fillOpacity={0.2} />}
          {inputPath && <path d={inputPath} fill="none" stroke={colors.info} strokeWidth={2} />}
          {totalPath && <path d={totalPath} fill="none" stroke={colors.success} strokeWidth={1.5} />}

          {geom.pts.length === 1 && (
            <>
              <circle cx={geom.pts[0].x} cy={geom.pts[0].yInput} r={3} fill={colors.info} />
              <circle cx={geom.pts[0].x} cy={geom.pts[0].yTotal} r={3} fill={colors.success} />
            </>
          )}

          {!hasData && (
            <text x={W / 2} y={geom.baseY - 12} textAnchor="middle" fontSize="12" fill={colors.textMuted}>
              No token usage in this period
            </text>
          )}

          <text x={PAD.left} y={H - 8} fontSize="11" fill={colors.textFaint}>
            {formatLabel(points[0].bucket)}
          </text>
          <text x={W - PAD.right} y={H - 8} textAnchor="end" fontSize="11" fill={colors.textFaint}>
            {formatLabel(points[points.length - 1].bucket)}
          </text>
        </svg>
      )}

      <table className="sr-only">
        <caption>Token usage per {granularity}</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Input tokens</th>
            <th scope="col">Output tokens</th>
            <th scope="col">Total tokens</th>
            <th scope="col">Cost</th>
            <th scope="col">Requests</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.bucket}>
              <td>{utcDay(p.bucket)}</td>
              <td>{p.input_tokens}</td>
              <td>{p.output_tokens}</td>
              <td>{p.tokens}</td>
              <td>{p.cost}</td>
              <td>{p.requests}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
