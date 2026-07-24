'use client'

import { Suspense, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { GettingStartedChecklist } from '@/components/ConnectionStatus'
import { EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui'
import { EventsSegment } from '@/components/dashboard/EventsSegment'
import { SessionsSegment } from '@/components/dashboard/SessionsSegment'
import { TimeTravelSegment } from '@/components/dashboard/TimeTravelSegment'
import { useAgents } from '@/hooks/useAgents'
import { useSelectedAgent } from '@/hooks/useSelectedAgent'
import { useAgentEvents } from '@/hooks/useAgentEvents'
import { useAgentStats } from '@/hooks/useAgentStats'
import { colors, radii } from '@/lib/design-tokens'

type Segment = 'events' | 'sessions' | 'timetravel'

const SEGMENTS: { id: Segment; label: string }[] = [
  { id: 'events', label: 'Events' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'timetravel', label: 'Time Travel' },
]

function SegmentedControl({
  value,
  onChange,
}: {
  value: Segment
  onChange: (s: Segment) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Activity view"
      className="inline-flex p-0.5 mb-5 overflow-x-auto max-w-full"
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radii.md,
      }}
    >
      {SEGMENTS.map((s) => {
        const active = s.id === value
        return (
          <button
            key={s.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(s.id)}
            className="text-xs font-medium px-3 py-1.5 whitespace-nowrap transition"
            style={{
              background: active ? colors.surfaceHover : 'transparent',
              color: active ? colors.textStrong : colors.textMuted,
              borderRadius: radii.sm,
            }}
          >
            {s.label}
          </button>
        )
      })}
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-xs" style={{ color: colors.textFaint }}>
        {label}
      </div>
      <div className="text-sm font-mono mt-0.5" style={{ color: colors.text }}>
        {value}
      </div>
    </div>
  )
}

function ActivityContent() {
  const { agents, loading: agentsLoading, error: agentsError } = useAgents()
  const { agentId, invalidAgent } = useSelectedAgent(agents)
  const [segment, setSegment] = useState<Segment>('events')

  // Hooks must run unconditionally; they no-op on a null agent.
  const events = useAgentEvents(agentId)
  const { stats } = useAgentStats(agentId)

  if (agentsLoading) return <Skeleton rows={6} />

  if (agentsError) {
    return <ErrorState message={agentsError} />
  }

  // Fresh install: nothing to scope any tab to yet.
  if (agents.length === 0) {
    return (
      <>
        <PageHeader
          title="Activity"
          description="Everything your agents record, as it happens."
        />
        <EmptyState
          title="No agents yet"
          description="An agent is created automatically the first time it logs an event. Follow the steps below to send your first one."
        />
        <div className="mt-5">
          <GettingStartedChecklist />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Activity"
        description={
          stats?.last_event
            ? `Last event ${formatDistanceToNow(new Date(stats.last_event), { addSuffix: true })}`
            : 'Everything this agent records, as it happens.'
        }
      />

      {invalidAgent && (
        <div
          className="mb-4 px-3 py-2.5 text-sm"
          style={{
            background: colors.warningBg,
            border: `1px solid ${colors.warning}40`,
            borderRadius: radii.md,
            color: colors.warning,
          }}
          role="status"
        >
          That agent no longer exists. Showing <span className="font-mono">{agentId}</span> instead.
        </div>
      )}

      {stats && (
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5 px-4 py-3"
          style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radii.lg,
          }}
        >
          <StatTile label="Total events" value={stats.total_events.toLocaleString()} />
          <StatTile label="Event types" value={stats.unique_event_types} />
          <StatTile label="Sessions" value={stats.sessions} />
          <StatTile
            label="First event"
            value={
              stats.first_event
                ? formatDistanceToNow(new Date(stats.first_event), { addSuffix: true })
                : '—'
            }
          />
        </div>
      )}

      <SegmentedControl value={segment} onChange={setSegment} />

      {segment === 'events' && <EventsSegment events={events} stats={stats} />}
      {segment === 'sessions' && <SessionsSegment agentId={agentId} />}
      {segment === 'timetravel' && <TimeTravelSegment agentId={agentId} />}
    </>
  )
}

export default function ActivityPage() {
  // useSelectedAgent reads useSearchParams — Next.js requires a Suspense
  // boundary or the route bails out of static rendering at build time.
  return (
    <Suspense fallback={<Skeleton rows={6} />}>
      <ActivityContent />
    </Suspense>
  )
}
