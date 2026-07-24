'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Trash2 } from 'lucide-react'
import type { Agent } from '@/lib/api'
import { deriveStatus } from '@/lib/events'
import { colors, radii } from '@/lib/design-tokens'
import { StatusBadge } from '@/components/ui'

/**
 * Fleet overview.
 *
 * Deliberately has no "Active Threads" column: `thread_id` doesn't exist in the
 * schema, so there is nothing truthful to put there yet.
 */
export function FleetTable({
  agents,
  onDelete,
  deletingAgent,
}: {
  agents: Agent[]
  onDelete: (agent: string) => void
  deletingAgent: string | null
}) {
  return (
    <div
      className="overflow-x-auto"
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radii.lg,
      }}
    >
      <table className="w-full text-sm" style={{ minWidth: 640 }}>
        <caption className="sr-only">Agents in this workspace</caption>
        <thead>
          <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
            {['Agent', 'Status', 'Events', 'Last event', ''].map((h, i) => (
              <th
                key={h || `actions-${i}`}
                scope="col"
                className={`px-4 py-2.5 text-xs font-medium ${i === 4 ? 'text-right' : 'text-left'}`}
                style={{ color: colors.textFaint }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {agents.map((a) => {
            const tone = deriveStatus({ lastSeen: a.last_seen })
            const isDeleting = deletingAgent === a.agent
            return (
              <tr
                key={a.agent}
                className="row-hover"
                style={{ borderTop: `1px solid ${colors.border}` }}
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/activity?agent=${encodeURIComponent(a.agent)}`}
                    className="font-mono hover:underline"
                    style={{ color: colors.text }}
                  >
                    {a.agent}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge tone={tone} />
                </td>
                <td className="px-4 py-3 font-mono" style={{ color: colors.textMuted }}>
                  {a.event_count.toLocaleString()}
                </td>
                <td className="px-4 py-3" style={{ color: colors.textMuted }}>
                  {a.last_seen
                    ? formatDistanceToNow(new Date(a.last_seen), { addSuffix: true })
                    : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onDelete(a.agent)}
                    disabled={isDeleting}
                    aria-label={`Delete agent ${a.agent}`}
                    title="Delete agent"
                    className="icon-hover p-1.5 disabled:opacity-40"
                    style={{ color: colors.textFaint, borderRadius: radii.sm }}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
