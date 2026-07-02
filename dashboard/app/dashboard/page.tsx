'use client'

import { ApiKeyUsage } from '@/components/ApiKeyUsage'
import { GettingStartedChecklist } from '@/components/ConnectionStatus'
import { useApiKeyQuota } from '@/hooks/useApiKeyQuota'
import { createAgent, deleteAgent, getAgents } from '@/lib/api'
import { getToken, requireAuth } from '@/lib/auth'
import { formatDistanceToNow } from 'date-fns'
import { Check, Copy, Plus, Trash2, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Agent {
  agent: string
  first_seen: string
  last_seen: string
  event_count: number
  api_key_count?: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [newAgentId, setNewAgentId] = useState('')
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState('')
  const [deletingAgent, setDeletingAgent] = useState<string | null>(null)
  const [newAgentKey, setNewAgentKey] = useState<string | null>(null)
  const [newAgentName, setNewAgentName] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const quota = useApiKeyQuota()

  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.replace('/login')
      return
    }

    let cancelled = false

    const loadAgents = (initial: boolean) => {
      if (initial) setLoading(true)
      getAgents(token)
        .then((data) => {
          if (!cancelled) {
            setAgents(Array.isArray(data) ? data : [])
            setLastSync(new Date())
          }
        })
        .catch((e) => {
          if (cancelled) return
          const msg = e instanceof Error ? e.message : 'Could not load your agents'
          if (msg.includes('401') || msg.toLowerCase().includes('invalid token')) {
            router.replace('/login')
            return
          }
          if (initial) setError(msg)
        })
        .finally(() => {
          if (!cancelled && initial) setLoading(false)
        })
    }

    loadAgents(true)
    const interval = setInterval(() => loadAgents(false), 10_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [router])

  async function handleCreateAgent(e: React.FormEvent) {
    e.preventDefault()
    const agentId = newAgentId.trim()
    if (!agentId) return
    setCreating(true)
    setCreateErr('')
    try {
      const token = requireAuth()
      const res = await createAgent(token, agentId)
      setNewAgentId('')
      if (res.api_key?.key) {
        setNewAgentKey(res.api_key.key)
        setNewAgentName(agentId)
      }
      const data = await getAgents(token)
      setAgents(Array.isArray(data) ? data : [])
      setLastSync(new Date())
      await quota.refresh()
    } catch (err) {
      setCreateErr(err instanceof Error ? err.message : 'Failed to create agent')
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteAgent(agentId: string) {
    if (!window.confirm(`Delete agent "${agentId}", its API keys, and all events? This cannot be undone.`)) {
      return
    }
    setDeletingAgent(agentId)
    try {
      const token = requireAuth()
      await deleteAgent(token, agentId)
      setAgents(prev => prev.filter(a => a.agent !== agentId))
      await quota.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete agent')
    } finally {
      setDeletingAgent(null)
    }
  }

  if (loading) return <PageShell><Skeleton /></PageShell>

  if (error) {
    return (
      <PageShell>
        <div className="rounded-xl p-8 text-center" style={{ background: '#111', border: '1px solid #1f1f1f' }}>
          <p className="text-white font-medium mb-2">Could not load dashboard</p>
          <p className="text-sm mb-4" style={{ color: '#e5e5e5' }}>{error}</p>
          <button
            type="button"
            onClick={() => router.replace('/login')}
            className="text-sm font-medium"
            style={{ color: '#22c55e', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Sign in again →
          </button>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white font-semibold text-xl">Agents</h1>
          <p className="text-sm mt-0.5" style={{ color: '#e5e5e5' }}>
            {agents.length} agent{agents.length !== 1 ? 's' : ''} tracked · updates every 10s
          </p>
        </div>
        {lastSync && (
          <div className="flex items-center gap-2 text-xs" style={{ color: '#e5e5e5' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#22c55e' }} />
            Live · synced {formatDistanceToNow(lastSync, { addSuffix: true })}
          </div>
        )}
      </div>

      <div className="rounded-xl p-5 mb-6" style={{ background: '#111', border: '1px solid #1f1f1f' }}>
        <h2 className="text-sm font-medium text-white mb-1">Create agent</h2>
        <p className="text-xs mb-3" style={{ color: '#e5e5e5' }}>
          Creates an agent and its first API key (shown once). Use the key as{' '}
          <span className="font-mono">ZIZKADB_API_KEY</span> or{' '}
          <span className="font-mono">AGENTDB_API_KEY</span> in your app.
        </p>
        {newAgentKey && (
          <div className="rounded-lg p-4 mb-3" style={{ background: '#0d2010', border: '1px solid #22c55e40' }}>
            <p className="text-xs font-medium mb-2" style={{ color: '#22c55e' }}>
              Agent &quot;{newAgentName}&quot; created — save this API key now
            </p>
            <div className="flex items-center gap-2">
              <code
                className="flex-1 text-xs font-mono rounded-lg px-3 py-2 truncate"
                style={{ background: '#0a0a0a', color: '#e5e5e5' }}
              >
                {newAgentKey}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(newAgentKey)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="p-2 rounded-lg shrink-0"
                style={{ background: '#1a1a1a' }}
              >
                {copied ? (
                  <Check size={14} style={{ color: '#22c55e' }} />
                ) : (
                  <Copy size={14} style={{ color: '#e5e5e5' }} />
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={() => { setNewAgentKey(null); setNewAgentName(null) }}
              className="text-xs mt-2"
              style={{ color: '#e5e5e5' }}
            >
              I&apos;ve saved my key — dismiss
            </button>
          </div>
        )}
        {!quota.unlimited && <ApiKeyUsage quota={quota} className="mb-3" />}
        <form onSubmit={handleCreateAgent} className="flex gap-3">
          <input
            value={newAgentId}
            onChange={e => setNewAgentId(e.target.value)}
            placeholder="agent-id"
            className="flex-1 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none"
            style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
            onFocus={e => (e.target.style.borderColor = '#22c55e')}
            onBlur={e => (e.target.style.borderColor = '#2a2a2a')}
          />
          <button
            type="submit"
            disabled={creating || !newAgentId.trim() || quota.at_limit}
            title={quota.at_limit ? 'API key limit reached — each agent includes a key' : undefined}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-black disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#22c55e' }}
          >
            <Plus size={14} />
            {creating ? 'Creating…' : 'Create'}
          </button>
        </form>
        {quota.at_limit && (
          <p className="text-xs mt-2" style={{ color: '#f87171' }}>
            You&apos;ve reached your plan&apos;s API key limit. Delete an API key or upgrade to add more agents.
          </p>
        )}
        {createErr && (
          <p className="text-xs mt-2" style={{ color: '#f87171' }}>{createErr}</p>
        )}
      </div>

      {agents.length === 0 ? (
        <GettingStartedChecklist />
      ) : (
        <div className="grid gap-3">
          {agents.map(agent => (
            <AgentCard
              key={agent.agent}
              agent={agent}
              deleting={deletingAgent === agent.agent}
              onDelete={() => handleDeleteAgent(agent.agent)}
              onClick={() => router.push(`/dashboard/agents/${encodeURIComponent(agent.agent)}`)}
            />
          ))}
        </div>
      )}
    </PageShell>
  )
}

function AgentCard({
  agent,
  onClick,
  onDelete,
  deleting,
}: {
  agent: Agent
  onClick: () => void
  onDelete: () => void
  deleting: boolean
}) {
  const lastSeen = formatDistanceToNow(new Date(agent.last_seen), { addSuffix: true })
  const isRecent = Date.now() - new Date(agent.last_seen).getTime() < 5 * 60 * 1000

  return (
    <div
      className="w-full rounded-xl p-5 transition group flex items-center justify-between gap-3"
      style={{ background: '#111', border: '1px solid #1f1f1f' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#1f1f1f')}
    >
      <button type="button" onClick={onClick} className="flex-1 text-left min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                 style={{ background: '#1a1a1a' }}>
              <Zap size={16} style={{ color: '#22c55e' }} />
            </div>
            <div className="min-w-0">
              <div className="text-white font-medium font-mono text-sm truncate">{agent.agent}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isRecent && (
                  <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
                        style={{ background: '#22c55e' }} />
                )}
                <span className="text-xs" style={{ color: '#e5e5e5' }}>
                  Active {lastSeen}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-right shrink-0 ml-4">
            <div>
              <div className="text-white font-semibold font-mono">
                {agent.event_count.toLocaleString()}
              </div>
            <div className="text-xs" style={{ color: '#e5e5e5' }}>events</div>
          </div>
          <div>
            <div className="text-white font-semibold font-mono">
              {(agent.api_key_count ?? 0).toLocaleString()}
            </div>
            <div className="text-xs" style={{ color: '#e5e5e5' }}>keys</div>
          </div>
          <span style={{ color: '#e5e5e5' }}>→</span>
          </div>
        </div>
      </button>
      <button
        type="button"
        disabled={deleting}
        onClick={onDelete}
        className="p-2 rounded-lg shrink-0 disabled:opacity-40"
        style={{ background: '#1a1a1a' }}
        title="Delete agent"
      >
        <Trash2 size={14} style={{ color: '#f87171' }} />
      </button>
    </div>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="p-8 max-w-4xl mx-auto">{children}</div>
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: '#111' }} />
      ))}
    </div>
  )
}
