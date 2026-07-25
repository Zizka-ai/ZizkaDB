'use client'

import { format } from 'date-fns'
import { AlertCircle, Rewind, Zap } from 'lucide-react'
import { colors, radii } from '@/lib/design-tokens'
import { Card, JsonBlock } from '@/components/ui'
import { useTimeTravel } from '@/hooks/useTimeTravel'

const QUICK_PICKS = [
  { label: '1 hour ago', ms: 60 * 60 * 1000 },
  { label: '6 hours ago', ms: 6 * 60 * 60 * 1000 },
  { label: '1 day ago', ms: 24 * 60 * 60 * 1000 },
  { label: '1 week ago', ms: 7 * 24 * 60 * 60 * 1000 },
]

/** `datetime-local` needs a naive local string, not an ISO instant. */
function toInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function isEmptyState(state: unknown): boolean {
  return !state || (typeof state === 'object' && Object.keys(state as object).length === 0)
}

export function TimeTravelSegment({ agentId }: { agentId: string | null }) {
  const tt = useTimeTravel(agentId)

  return (
    <div className="max-w-2xl">
      <div
        className="mb-6 p-4 text-sm"
        style={{
          background: colors.surfaceAlt,
          border: `1px solid ${colors.border}`,
          borderRadius: radii.lg,
          color: colors.textMuted,
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Rewind size={14} style={{ color: colors.success }} />
          <span style={{ color: colors.textStrong }} className="font-medium">
            Time Travel
          </span>
        </div>
        Reconstruct logged state for <span className="font-mono">{agentId}</span> at any point in
        time — every event that had happened up to that moment.
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <label className="sr-only" htmlFor="tt-timestamp">
          Point in time to reconstruct
        </label>
        <input
          id="tt-timestamp"
          type="datetime-local"
          value={tt.timestamp}
          onChange={(e) => tt.setTimestamp(e.target.value)}
          className="flex-1 px-3 py-2.5 text-sm outline-none"
          style={{
            background: colors.surface,
            border: `1px solid ${colors.borderStrong}`,
            borderRadius: radii.md,
            color: colors.text,
            colorScheme: 'dark',
          }}
        />
        <button
          onClick={tt.run}
          disabled={tt.loading || !tt.timestamp}
          className="px-5 py-2.5 text-sm font-medium transition disabled:opacity-40"
          style={{
            background: colors.successBg,
            border: `1px solid ${colors.success}40`,
            borderRadius: radii.md,
            color: colors.success,
          }}
        >
          {tt.loading ? 'Reconstructing…' : 'Reconstruct state'}
        </button>
      </div>

      {!tt.result && (
        <div className="mb-6">
          <div className="text-xs mb-2" style={{ color: colors.textFaint }}>
            Quick picks
          </div>
          <div className="flex gap-2 flex-wrap">
            {QUICK_PICKS.map(({ label, ms }) => (
              <button
                key={label}
                onClick={() => tt.setTimestamp(toInputValue(new Date(Date.now() - ms)))}
                className="text-xs px-3 py-1.5 transition"
                style={{
                  background: colors.surface,
                  color: colors.textMuted,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.md,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {tt.error && (
        <div
          className="flex items-center gap-2 p-3 mb-4 text-sm"
          style={{
            background: colors.dangerBg,
            border: `1px solid ${colors.danger}40`,
            borderRadius: radii.md,
            color: colors.danger,
          }}
          role="alert"
        >
          <AlertCircle size={14} />
          {tt.error}
        </div>
      )}

      {tt.result && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card>
              <div className="text-xs mb-1" style={{ color: colors.textFaint }}>
                Events at this time
              </div>
              <div className="text-2xl font-bold font-mono" style={{ color: colors.textStrong }}>
                {tt.result.event_count}
              </div>
            </Card>
            <Card>
              <div className="text-xs mb-1" style={{ color: colors.textFaint }}>
                Reconstructed at
              </div>
              <div className="text-sm font-mono" style={{ color: colors.textStrong }}>
                {format(new Date(tt.timestamp), 'MMM d yyyy, HH:mm:ss')}
              </div>
            </Card>
          </div>

          <div
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.lg,
            }}
          >
            <div
              className="px-4 py-3 flex items-center gap-2 flex-wrap"
              style={{ borderBottom: `1px solid ${colors.border}` }}
            >
              <Zap size={13} style={{ color: colors.success }} />
              <span className="text-sm font-medium" style={{ color: colors.textStrong }}>
                Reconstructed state
              </span>
              <span className="text-xs ml-auto" style={{ color: colors.textFaint }}>
                Based on all STATE_SET events up to this point
              </span>
            </div>
            <div className="p-4">
              {isEmptyState(tt.result.state) ? (
                <p className="text-sm" style={{ color: colors.textMuted }}>
                  No state had been set by this point. State is built from{' '}
                  <span className="font-mono">STATE_SET</span> events — log some and the
                  reconstruction will fill in here.
                </p>
              ) : (
                <JsonBlock value={tt.result.state} maxHeight={300} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
