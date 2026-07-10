'use client'

import { useState, type FormEvent } from 'react'
import { submitDemoRequest } from '@/lib/demo'
import { M, container, h2, lead, sectionTitle, violetBtn } from './marketing-theme'
import { useLanding } from './LandingContext'

export function EnterpriseSection() {
  const { track, setDemoOpen } = useLanding()
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', company_name: '', website: '',
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [errMsg, setErrMsg] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrMsg('')
    try {
      await submitDemoRequest(form)
      track('demo_submit', { company: form.company_name })
      setStatus('ok')
      setForm({ first_name: '', last_name: '', email: '', company_name: '', website: '' })
    } catch (err) {
      setStatus('err')
      setErrMsg(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: `1px solid rgba(255,255,255,0.15)`, background: 'rgba(255,255,255,0.06)',
    color: '#fff', fontSize: 14, outline: 'none',
  } as const

  return (
    <section id="enterprise" className="zdb-section" style={{
      padding: '80px 40px', background: M.heroBg, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: M.heroGlowBlue, pointerEvents: 'none' }} />
      <div style={{ ...container(920), position: 'relative', zIndex: 1 }}>
        <p style={{ ...sectionTitle, color: 'rgba(255,255,255,0.5)' }}>Enterprise</p>
        <h2 style={{ ...h2, color: '#fff' }}>Operational database for agent fleets</h2>
        <p style={{ ...lead, color: 'rgba(255,255,255,0.65)' }}>
          Long retention, fleet-wide replay, and onboarding for teams running many agents in production.
        </p>

        <div className="zdb-enterprise-grid" style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, alignItems: 'start',
        }}>
          <div>
            {[
              'Replay and root-cause any session across agents',
              'Drift detection after prompt or model changes',
              'Human onboarding — we help you get production-ready',
            ].map(t => (
              <div key={t} style={{
                display: 'flex', gap: 12, marginBottom: 14, fontSize: 15, color: 'rgba(255,255,255,0.85)', lineHeight: 1.55,
              }}>
                <span style={{ color: M.violet, fontWeight: 800 }}>✓</span>
                {t}
              </div>
            ))}
            <button
              type="button"
              onClick={() => { track('cta_click', { cta: 'calendly', source: 'enterprise' }); setDemoOpen(true) }}
              style={{ ...violetBtn, cursor: 'pointer', marginTop: 8 }}
            >
              Or pick a time on Calendly →
            </button>
          </div>

          <form onSubmit={onSubmit} style={{
            padding: '24px 22px', borderRadius: 18,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <input required placeholder="First name" value={form.first_name}
                onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} style={inputStyle} />
              <input required placeholder="Last name" value={form.last_name}
                onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} style={inputStyle} />
            </div>
            <input required type="email" placeholder="Work email" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              style={{ ...inputStyle, marginBottom: 12 }} />
            <input required placeholder="Company" value={form.company_name}
              onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
              style={{ ...inputStyle, marginBottom: 12 }} />
            <input required placeholder="Website" value={form.website}
              onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
              style={{ ...inputStyle, marginBottom: 16 }} />
            {status === 'ok' && (
              <p style={{ color: '#4ade80', fontSize: 13, marginBottom: 12 }}>Thanks — we will be in touch shortly.</p>
            )}
            {status === 'err' && (
              <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{errMsg}</p>
            )}
            <button type="submit" disabled={status === 'loading'} style={{
              ...violetBtn, width: '100%', justifyContent: 'center', cursor: 'pointer',
              opacity: status === 'loading' ? 0.7 : 1,
            }}>
              {status === 'loading' ? 'Sending…' : 'Contact sales'}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
