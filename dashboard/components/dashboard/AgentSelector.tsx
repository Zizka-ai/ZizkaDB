'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { colors, radii } from '@/lib/design-tokens'
import type { Agent } from '@/lib/api'

/** Above this many agents, show a filter box inside the dropdown. */
const FILTER_THRESHOLD = 8

/**
 * Agent picker for multi-agent (managed) plans.
 *
 * Rendered only when there is a real choice to make — a single-agent (OSS)
 * install shows a plain label instead, so the UI never asks the user to pick
 * from a list of one.
 */
export function AgentSelector({
  agents,
  selected,
  onSelect,
}: {
  agents: Agent[]
  selected: string | null
  onSelect: (agent: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return q ? agents.filter((a) => a.agent.toLowerCase().includes(q)) : agents
  }, [agents, filter])

  if (agents.length === 0) return null

  // Single agent: nothing to choose — just show which agent you're looking at.
  if (agents.length === 1) {
    return (
      <span
        className="text-sm font-mono truncate max-w-[220px]"
        style={{ color: colors.text }}
        title={agents[0].agent}
      >
        {agents[0].agent}
      </span>
    )
  }

  return (
    <div
      className="relative"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation()
          setOpen(false)
          setFilter('')
        }
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select agent"
        className="btn-hover flex items-center gap-2 px-3 py-1.5 text-sm"
        style={{
          background: colors.surfaceAlt,
          border: `1px solid ${colors.borderStrong}`,
          borderRadius: radii.md,
          color: colors.text,
        }}
      >
        <span className="font-mono truncate max-w-[200px]">{selected ?? 'Select agent'}</span>
        <ChevronDown size={14} style={{ color: colors.textMuted }} />
      </button>

      {open && (
        <>
          {/* Click-away layer */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="listbox"
            className="absolute right-0 mt-1 z-20 w-72 max-h-80 overflow-auto"
            style={{
              background: colors.surface,
              border: `1px solid ${colors.borderStrong}`,
              borderRadius: radii.lg,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}
          >
            {agents.length > FILTER_THRESHOLD && (
              <div className="p-2" style={{ borderBottom: `1px solid ${colors.border}` }}>
                <div className="relative">
                  <Search
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2"
                    style={{ color: colors.textFaint }}
                  />
                  <input
                    autoFocus
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Filter agents"
                    aria-label="Filter agents"
                    className="w-full pl-8 pr-2 py-1.5 text-sm outline-none"
                    style={{
                      background: colors.surfaceAlt,
                      border: `1px solid ${colors.borderStrong}`,
                      borderRadius: radii.md,
                      color: colors.text,
                    }}
                  />
                </div>
              </div>
            )}

            {visible.length === 0 ? (
              <p className="px-3 py-3 text-sm" style={{ color: colors.textMuted }}>
                No agents match “{filter}”.
              </p>
            ) : (
              visible.map((a) => {
                const isSel = a.agent === selected
                return (
                  <button
                    key={a.agent}
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    onClick={() => {
                      onSelect(a.agent)
                      setOpen(false)
                      setFilter('')
                    }}
                    className="opt-hover w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2"
                    style={{
                      background: isSel ? colors.surfaceHover : 'transparent',
                      color: isSel ? colors.textStrong : colors.text,
                    }}
                  >
                    <span className="font-mono truncate" title={a.agent}>
                      {a.agent}
                    </span>
                    <span className="text-xs shrink-0" style={{ color: colors.textFaint }}>
                      {a.event_count.toLocaleString()}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}
