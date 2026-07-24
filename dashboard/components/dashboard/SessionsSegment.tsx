'use client'

import { useState } from 'react'
import { format, formatDuration, intervalToDuration } from 'date-fns'
import { Layers } from 'lucide-react'
import type { AgentSession } from '@/lib/api'
import { eventColor } from '@/lib/events'
import { colors, radii } from '@/lib/design-tokens'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui'
import { useAgentSessions } from '@/hooks/useAgentSessions'
import { EventList } from './EventList'

function humanDuration(seconds: number): string {
  if (seconds <= 0) return '<1s'
  const parts = formatDuration(intervalToDuration({ start: 0, end: seconds * 1000 }), {
    format: ['hours', 'minutes', 'seconds'],
  })
  return (
    parts.replace(' seconds', 's').replace(' minutes', 'm').replace(' hours', 'h') || '<1s'
  )
}

export function SessionsSegment({ agentId }: { agentId: string | null }) {
  const { sessions, loading, error, selected, detailEvents, detailDiff, detailLoading, openSession } =
    useAgentSessions(agentId)
  const [expanded, setExpanded] = useState<string | null>(null)

  if (loading) return <Skeleton rows={5} />
  if (error) return <ErrorState message={error} />

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={<Layers size={22} style={{ color: colors.textFaint }} />}
        title="No sessions recorded yet"
        description="Pass a session_id when logging events and each run will be grouped here, with the memory that changed during it."
      />
    )
  }

  const newTypes = (detailDiff as { new_event_types?: string[] } | null)?.new_event_types
  const summary = (detailDiff as { summary?: string } | null)?.summary

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="w-full lg:w-72 shrink-0">
        <h2 className="text-xs font-medium mb-3" style={{ color: colors.textMuted }}>
          {sessions.length} session{sessions.length !== 1 ? 's' : ''}
        </h2>
        <div className="space-y-1.5">
          {sessions.map((s: AgentSession) => {
            const isSelected = selected?.session_id === s.session_id
            return (
              <button
                key={s.session_id}
                onClick={() => openSession(s)}
                aria-pressed={isSelected}
                className="w-full text-left p-3.5 transition"
                style={{
                  background: isSelected ? colors.successBg : colors.surface,
                  border: `1px solid ${isSelected ? '#22c55e40' : colors.border}`,
                  borderRadius: radii.lg,
                }}
              >
                <div
                  className="text-xs font-mono mb-1 truncate"
                  style={{ color: colors.text }}
                  title={s.session_id}
                >
                  {s.session_id.slice(0, 20)}…
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs" style={{ color: colors.textMuted }}>
                    {s.event_count} events · {s.event_types} types
                  </span>
                  <span className="text-xs shrink-0" style={{ color: colors.textFaint }}>
                    {humanDuration(s.duration_seconds)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {s.types.slice(0, 4).map((t) => (
                    <span
                      key={t}
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: `${eventColor(t)}20`, color: eventColor(t) }}
                    >
                      {t}
                    </span>
                  ))}
                  {s.types.length > 4 && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: colors.surfaceHover, color: colors.textMuted }}
                    >
                      +{s.types.length - 4}
                    </span>
                  )}
                </div>
                <div className="text-xs mt-1.5" style={{ color: colors.textFaint }}>
                  {format(new Date(s.started_at), 'MMM d, HH:mm:ss')}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {!selected ? (
          <EmptyState
            icon={<Layers size={22} style={{ color: colors.textFaint }} />}
            title="Select a session"
            description="Pick a session on the left to inspect the events it recorded and what changed in memory."
          />
        ) : detailLoading ? (
          <Skeleton rows={6} />
        ) : (
          <div>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h2
                  className="text-sm font-medium font-mono truncate"
                  style={{ color: colors.textStrong }}
                  title={selected.session_id}
                >
                  {selected.session_id}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                  {format(new Date(selected.started_at), 'MMM d yyyy, HH:mm:ss')}
                  {' → '}
                  {format(new Date(selected.ended_at), 'HH:mm:ss')}
                </p>
              </div>
              {detailDiff && (
                <div
                  className="text-xs px-3 py-1.5 shrink-0"
                  style={{
                    background: colors.surfaceHover,
                    border: `1px solid ${colors.borderStrong}`,
                    borderRadius: radii.md,
                    color: newTypes?.length ? colors.success : colors.textMuted,
                  }}
                >
                  {newTypes?.length
                    ? `${newTypes.length} new event type${newTypes.length !== 1 ? 's' : ''}`
                    : 'No new event types'}
                </div>
              )}
            </div>

            {summary && (
              <div
                className="mb-4 p-3 text-sm"
                style={{
                  background: colors.successBg,
                  border: `1px solid ${colors.success}20`,
                  borderRadius: radii.md,
                  color: '#86efac',
                }}
              >
                {summary}
              </div>
            )}

            {detailEvents.length === 0 ? (
              <EmptyState
                title="No events in this session"
                description="This session was recorded but has no events attached to it."
              />
            ) : (
              <EventList
                events={detailEvents}
                selected={null}
                expanded={expanded}
                onSelect={() => {}}
                onToggleExpand={(id) => setExpanded(expanded === id ? null : id)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
