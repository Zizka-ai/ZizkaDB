'use client'

import { BRAND } from '@/components/brand'
import { type AudienceSegment, useLanding } from './LandingContext'
import { M } from './marketing-theme'

const SEGMENTS: { id: AudienceSegment; label: string }[] = [
  { id: 'solo', label: 'Solo dev' },
  { id: 'managed', label: 'Managed cloud' },
  { id: 'enterprise', label: 'Enterprise' },
]

export function SegmentPicker() {
  const { segment, setSegment } = useLanding()

  return (
    <div style={{
      display: 'inline-flex', gap: 6, padding: 4, borderRadius: 999,
      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    }}>
      {SEGMENTS.map(s => {
        const on = segment === s.id
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => setSegment(s.id)}
            style={{
              fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 999,
              border: on ? `1px solid ${BRAND}` : '1px solid transparent',
              background: on ? 'rgba(249,115,22,0.2)' : 'transparent',
              color: on ? '#fff' : 'rgba(255,255,255,0.55)',
              cursor: 'pointer',
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            {s.label}
          </button>
        )
      })}
    </div>
  )
}

export function segmentSubline(segment: AudienceSegment): string {
  if (segment === 'solo') {
    return 'Self-host free on GitHub, or plug MCP into Cursor — same operational store when you scale to cloud.'
  }
  if (segment === 'enterprise') {
    return 'Fleet-wide replay, long retention, and human onboarding for teams running agents in production.'
  }
  return 'We run Postgres, vectors, and the dashboard at db.zizka.ai — you ship agents, not infrastructure.'
}

export function segmentAccent(segment: AudienceSegment): string {
  if (segment === 'solo') return M.teal
  if (segment === 'enterprise') return M.violet
  return BRAND
}
