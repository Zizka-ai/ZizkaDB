'use client'

import { Suspense } from 'react'
import { AgentApiKeys } from '@/components/AgentApiKeys'
import { LoadingLine } from '@/components/ui'
import { useAgents } from '@/hooks/useAgents'
import { useSelectedAgent } from '@/hooks/useSelectedAgent'
import { useEdition } from '@/hooks/useEdition'
import { colors, radii } from '@/lib/design-tokens'

function Inner() {
  const { agents, loading } = useAgents()
  const { agentId } = useSelectedAgent(agents)
  const isOss = useEdition().edition === 'oss'

  if (loading) return <LoadingLine label="Loading agents…" />

  return (
    <div
      className="p-5 mb-6"
      style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg }}
    >
      <h2 className="text-sm font-medium mb-1" style={{ color: colors.textStrong }}>
        {isOss ? 'API key' : 'Per-agent API keys'}
      </h2>
      <p className="text-xs mb-3" style={{ color: colors.textMuted }}>
        {isOss
          ? 'The key your app uses to connect to this agent.'
          : 'Keys scoped to a single agent — the recommended default. Use the agent selector in the header to manage a different agent’s keys.'}
      </p>

      {agentId ? (
        <AgentApiKeys agentId={agentId} oneKeyMax={isOss} />
      ) : (
        <p className="text-xs" style={{ color: colors.textFaint }}>
          {isOss
            ? 'No agent yet. Start logging events with the SDK to create one.'
            : 'No agents yet. Create one on Agent Fleets, or start logging events with the SDK.'}
        </p>
      )}
    </div>
  )
}

/**
 * Per-agent API key management, relocated here from the old agent-detail page.
 * Scoped to whichever agent the header selector has active.
 */
export function AgentKeysSection() {
  return (
    <Suspense fallback={<LoadingLine label="Loading agents…" />}>
      <Inner />
    </Suspense>
  )
}
