'use client'

import { Suspense } from 'react'
import { EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui'
import { BehaviorPanel } from '@/components/dashboard/BehaviorPanel'
import { useAgents } from '@/hooks/useAgents'
import { useSelectedAgent } from '@/hooks/useSelectedAgent'
import { useAgentBehavior, type BehaviorWindow } from '@/hooks/useAgentBehavior'
import { colors, radii } from '@/lib/design-tokens'

const WINDOWS: { key: BehaviorWindow; label: string }[] = [
  { key: undefined, label: 'Sessions' },
  { key: '24h', label: '24h' },
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
]

function WindowSelector({
  value,
  onChange,
}: {
  value: BehaviorWindow
  onChange: (w: BehaviorWindow) => void
}) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className="text-xs" style={{ color: colors.textFaint }}>
        Window
      </span>
      <div className="flex gap-1 overflow-x-auto">
        {WINDOWS.map((w) => {
          const active = value === w.key
          return (
            <button
              key={String(w.key)}
              onClick={() => onChange(w.key)}
              aria-pressed={active}
              className="px-3 py-1 text-xs transition whitespace-nowrap"
              style={{
                background: active ? colors.surfaceHover : 'transparent',
                color: active ? colors.textStrong : colors.textMuted,
                border: `1px solid ${active ? colors.borderStrong : colors.border}`,
                borderRadius: radii.md,
              }}
            >
              {w.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function BehaviorContent() {
  const { agents, loading: agentsLoading, error: agentsError } = useAgents()
  const { agentId } = useSelectedAgent(agents)
  const { baseline, loading, error, window, setWindow, recompute } = useAgentBehavior(agentId)

  if (agentsLoading) return <Skeleton rows={6} />
  if (agentsError) return <ErrorState message={agentsError} />

  if (agents.length === 0) {
    return (
      <>
        <PageHeader title="Agent Behavior" />
        <EmptyState
          title="No agents yet"
          description="Behavior baselines are built from recorded sessions. Once an agent starts logging events, its baseline appears here."
        />
      </>
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold leading-tight" style={{ color: colors.textStrong }}>
            Agent Behavior
          </h1>
          <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
            How this agent&apos;s recent behavior compares with its established baseline.
          </p>
        </div>
        <WindowSelector value={window} onChange={setWindow} />
      </div>

      {loading ? (
        <Skeleton rows={6} />
      ) : error ? (
        <ErrorState message={error} />
      ) : baseline && agentId ? (
        <BehaviorPanel
          baseline={baseline}
          agentId={agentId}
          window={window}
          onRecompute={recompute}
        />
      ) : null}
    </>
  )
}

export default function BehaviorPage() {
  return (
    <Suspense fallback={<Skeleton rows={6} />}>
      <BehaviorContent />
    </Suspense>
  )
}
