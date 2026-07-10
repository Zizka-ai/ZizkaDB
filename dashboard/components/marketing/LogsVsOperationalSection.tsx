'use client'

import { useState } from 'react'
import { BRAND } from '@/components/brand'
import { M, container, h2, lead } from './marketing-theme'
import { useLanding } from './LandingContext'

type Mode = 'traces' | 'vectors' | 'zizkadb'

const MODES: { id: Mode; label: string }[] = [
  { id: 'traces', label: 'Traces only' },
  { id: 'vectors', label: 'Vector DB only' },
  { id: 'zizkadb', label: 'ZizkaDB' },
]

const CONTENT: Record<Mode, { title: string; lines: string[]; outcome: string; ok: boolean }> = {
  traces: {
    title: 'Scattered spans across tools',
    lines: [
      'See HTTP latency and span names',
      'Hard to connect tool call → agent decision → user outcome',
      'Replay means stitching logs manually',
    ],
    outcome: 'Hours guessing. Still no root cause.',
    ok: false,
  },
  vectors: {
    title: 'Similar chunks, no session story',
    lines: [
      'Find related embeddings across documents',
      'No causal chain for a single production session',
      'Drift after prompt change is invisible',
    ],
    outcome: 'Good for search. Not operational for agents.',
    ok: false,
  },
  zizkadb: {
    title: 'Full operational picture',
    lines: [
      'Replay the session end-to-end in one store',
      'Trace why the agent chose each action',
      'Drift alert when prompt v2 changes refund answers',
    ],
    outcome: 'Root cause in minutes. Prompt rolled back.',
    ok: true,
  },
}

export function LogsVsOperationalSection() {
  const [mode, setMode] = useState<Mode>('zizkadb')
  const { track } = useLanding()
  const c = CONTENT[mode]

  return (
    <section id="demo" className="zdb-section" style={{ padding: '80px 40px', background: '#fff' }}>
      <div style={container(980)}>
        <h2 style={h2}>Logs tell you what. ZizkaDB tells you why.</h2>
        <p style={lead}>Same production incident — three different tools. Click to compare.</p>

        <div style={{
          display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28,
        }}>
          {MODES.map(m => {
            const on = mode === m.id
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => { setMode(m.id); track('compare_toggle', { mode: m.id }) }}
                style={{
                  fontSize: 13, fontWeight: 700, padding: '10px 18px', borderRadius: 999, cursor: 'pointer',
                  border: on ? `2px solid ${m.id === 'zizkadb' ? BRAND : M.line}` : `1px solid ${M.line}`,
                  background: on ? (m.id === 'zizkadb' ? '#fff7ed' : M.wash) : '#fff',
                  color: '#000',
                }}
              >
                {m.label}
              </button>
            )
          })}
        </div>

        <div style={{
          borderRadius: 20, overflow: 'hidden',
          border: c.ok ? `2px solid ${BRAND}` : `1px solid ${M.line}`,
          boxShadow: c.ok ? '0 16px 48px rgba(249,115,22,0.12)' : '0 4px 20px rgba(15,23,42,0.04)',
          maxWidth: 640, margin: '0 auto',
        }}>
          <div style={{
            padding: '18px 22px',
            background: c.ok ? 'linear-gradient(135deg, #fff7ed, #eff6ff)' : M.wash,
            borderBottom: `1px solid ${M.line}`,
          }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#000' }}>{c.title}</div>
          </div>
          <div style={{ padding: '22px 24px', background: '#fff' }}>
            <ul style={{ margin: '0 0 20px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {c.lines.map(line => (
                <li key={line} style={{
                  fontSize: 14, color: '#334155', lineHeight: 1.55, padding: '12px 14px',
                  borderRadius: 10, background: M.wash, border: `1px solid ${M.line}`,
                }}>
                  {line}
                </li>
              ))}
            </ul>
            <div style={{
              fontSize: 14, fontWeight: 700, padding: '14px 16px', borderRadius: 12,
              background: c.ok ? '#ecfdf5' : '#fef2f2',
              color: c.ok ? '#065f46' : '#991b1b',
              border: `1px solid ${c.ok ? '#a7f3d0' : '#fecaca'}`,
            }}>
              {c.outcome}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
