'use client'

import { useState } from 'react'
import { BRAND } from '@/components/brand'
import { M, container, h2, lead, sectionTitle } from './marketing-theme'
import { useLanding } from './LandingContext'

const STEPS = [
  {
    id: 'store',
    title: 'Store',
    benefit: 'Every message, tool call, and outcome in one operational store.',
    detail: 'One API key per agent. Log from Python, TypeScript, MCP, or REST.',
  },
  {
    id: 'replay',
    title: 'Replay',
    benefit: 'Rewind any session and see exactly what the agent knew.',
    detail: 'Time-travel through production runs — not just the last log line.',
  },
  {
    id: 'explain',
    title: 'Explain',
    benefit: 'Follow the decision chain when something goes wrong.',
    detail: 'See why the agent chose an action, not only what happened.',
  },
  {
    id: 'alert',
    title: 'Alert',
    benefit: 'Catch behavior drift after a prompt or model change.',
    detail: 'Get notified before users flood support with the same failure.',
  },
] as const

export function OperationalMeansSection() {
  const [active, setActive] = useState<(typeof STEPS)[number]['id']>('store')
  const { track } = useLanding()
  const step = STEPS.find(s => s.id === active) ?? STEPS[0]

  return (
    <section className="zdb-section" style={{ padding: '80px 40px', background: M.wash }}>
      <div style={container(960)}>
        <p style={sectionTitle}>What operational means</p>
        <h2 style={h2}>Store. Replay. Explain. Alert.</h2>
        <p style={lead}>Four capabilities that turn agent logs into something you can act on.</p>

        <div className="zdb-operational-grid" style={{
          display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, alignItems: 'start',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {STEPS.map((s, i) => {
              const on = active === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setActive(s.id); track('cta_click', { action: 'operational_step', step: s.id }) }}
                  style={{
                    textAlign: 'left', padding: '16px 18px', borderRadius: 14, cursor: 'pointer',
                    border: on ? `2px solid ${BRAND}` : `1px solid ${M.line}`,
                    background: on ? '#fff' : 'rgba(255,255,255,0.6)',
                    boxShadow: on ? '0 8px 28px rgba(249,115,22,0.12)' : 'none',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 800, color: BRAND, marginBottom: 4 }}>
                    0{i + 1}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#000' }}>{s.title}</div>
                </button>
              )
            })}
          </div>

          <div style={{
            padding: '32px 28px', borderRadius: 20, background: '#fff',
            border: `1px solid ${M.line}`, minHeight: 220,
            boxShadow: '0 8px 32px rgba(15,23,42,0.06)',
          }}>
            <h3 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 12px', color: '#000', letterSpacing: -0.3 }}>
              {step.benefit}
            </h3>
            <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.65, margin: 0 }}>
              {step.detail}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
