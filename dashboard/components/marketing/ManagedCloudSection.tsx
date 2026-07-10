'use client'

import Link from 'next/link'
import { useState } from 'react'
import { BRAND } from '@/components/brand'
import { M, container, h2, lead, sectionTitle, primaryBtn, violetBtn } from './marketing-theme'
import { useLanding } from './LandingContext'

export function ManagedCloudSection() {
  const [agents, setAgents] = useState(3)
  const { track, setDemoOpen } = useLanding()

  const hint =
    agents >= 10
      ? 'Running a fleet? Book a walkthrough — we help with retention, seats, and onboarding.'
      : agents >= 5
        ? 'Team plan fits most growing agent fleets — 1B events/mo, 10 seats, priority support.'
        : 'Pro at €39/mo — 100M events, 90-day retention, full session replay.'

  return (
    <section className="zdb-section" style={{
      padding: '80px 40px',
      background: `linear-gradient(180deg, #fff7ed 0%, #fff 100%)`,
      borderTop: `1px solid ${M.line}`,
      borderBottom: `1px solid ${M.line}`,
    }}>
      <div style={container(900)}>
        <p style={sectionTitle}>Managed cloud</p>
        <h2 style={h2}>Operational in production — without operating infrastructure</h2>
        <p style={lead}>
          We host Postgres, vectors, retention, and the dashboard at db.zizka.ai. Same SDK as self-host — swap your API key when you scale.
        </p>

        <div style={{
          padding: '28px 26px', borderRadius: 20, background: '#fff',
          border: `2px solid ${BRAND}33`, boxShadow: '0 12px 40px rgba(249,115,22,0.08)',
        }}>
          <label htmlFor="agent-slider" style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#000', marginBottom: 12 }}>
            How many agents are you running? <span style={{ color: BRAND }}>{agents}</span>
          </label>
          <input
            id="agent-slider"
            type="range"
            min={1}
            max={20}
            value={agents}
            onChange={e => {
              const v = Number(e.target.value)
              setAgents(v)
              track('agent_slider', { agents: v })
            }}
            style={{ width: '100%', accentColor: BRAND, marginBottom: 16 }}
          />
          <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.6, margin: '0 0 20px' }}>{hint}</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {agents >= 10 ? (
              <button
                type="button"
                onClick={() => { track('cta_click', { cta: 'book_demo', source: 'managed_slider' }); setDemoOpen(true) }}
                style={{ ...violetBtn, cursor: 'pointer' }}
              >
                Book a walkthrough
              </button>
            ) : (
              <Link href="/signup" onClick={() => track('cta_click', { cta: 'signup', source: 'managed_slider' })} style={primaryBtn}>
                Start free on db.zizka.ai →
              </Link>
            )}
            <Link href="/docs" style={{
              display: 'inline-flex', alignItems: 'center', padding: '14px 20px',
              borderRadius: 12, border: `1px solid ${M.line}`, textDecoration: 'none',
              fontWeight: 600, fontSize: 14, color: '#000', background: '#fff',
            }}>
              5-minute setup
            </Link>
          </div>
        </div>

        <div className="zdb-managed-benefits" style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 24,
        }}>
          {[
            { title: 'Zero ops', body: 'No Docker, backups, or vector stack to babysit.' },
            { title: 'Drift + replay', body: 'Alerts and session replay on every plan.' },
            { title: 'Same API', body: 'Self-host locally, go managed when ready.' },
          ].map(b => (
            <div key={b.title} style={{
              padding: '20px 18px', borderRadius: 14, background: '#fff', border: `1px solid ${M.line}`,
            }}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6, color: '#000' }}>{b.title}</div>
              <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.55 }}>{b.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
