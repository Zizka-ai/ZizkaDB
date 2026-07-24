'use client'

import { colors, radii } from '@/lib/design-tokens'
import { formatDuration, formatUtcMonthDayTime } from '@/lib/report'
import type { ReportSession } from '@/lib/api'

/** Sessions recorded in the window. Scrolls horizontally on small screens. */
export function SessionsTable({ sessions }: { sessions: ReportSession[] }) {
  if (sessions.length === 0) return null

  return (
    <div
      style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg }}
    >
      <div className="px-4 py-3" style={{ borderBottom: `1px solid ${colors.border}` }}>
        <h3 className="text-sm font-medium" style={{ color: colors.textStrong }}>
          Sessions
          <span className="ml-2 font-normal" style={{ color: colors.textFaint }}>
            {sessions.length}
            {sessions.length === 100 ? '+ (showing most recent 100)' : ''}
          </span>
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: 560 }}>
          <thead>
            <tr>
              {['Session', 'Events', 'Types', 'Duration', 'Started'].map((h, i) => (
                <th
                  key={h}
                  scope="col"
                  className={`px-4 py-2 text-xs font-medium ${i === 0 ? 'text-left' : 'text-right'}`}
                  style={{ color: colors.textFaint }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.session_id} className="row-hover" style={{ borderTop: `1px solid ${colors.border}` }}>
                <td className="px-4 py-2 font-mono truncate" style={{ color: colors.text, maxWidth: 220 }} title={s.session_id}>
                  {s.session_id}
                </td>
                <td className="px-4 py-2 text-right font-mono" style={{ color: colors.text }}>
                  {s.event_count}
                </td>
                <td className="px-4 py-2 text-right font-mono" style={{ color: colors.textMuted }}>
                  {s.event_types}
                </td>
                <td className="px-4 py-2 text-right font-mono" style={{ color: colors.textMuted }}>
                  {formatDuration(s.duration_seconds)}
                </td>
                <td className="px-4 py-2 text-right" style={{ color: colors.textMuted }}>
                  {formatUtcMonthDayTime(s.started_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
