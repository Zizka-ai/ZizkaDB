'use client'

import { useState, type FormEvent } from 'react'
import { COPY } from './enterprise-copy'
import { submitDemoRequest } from '@/lib/demo'
import { M } from '../marketing-theme'
import { BRAND } from '@/components/brand'

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 10,
  border: `1px solid ${M.line}`,
  fontSize: 14,
  fontFamily: 'inherit',
  boxSizing: 'border-box' as const,
}

const labelStyle = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#000',
  marginBottom: 6,
}

type Props = {
  id?: string
}

export function EnterpriseConnectForm({ id }: Props) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [position, setPosition] = useState('')
  const [website, setWebsite] = useState('')
  const [botcheck, setBotcheck] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (botcheck) return
    setLoading(true)
    setError('')
    try {
      await submitDemoRequest({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        company_name: company.trim(),
        website: website.trim(),
        position: position.trim() || undefined,
        source: 'enterprise',
      })
      setSuccess(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : COPY.form.genericError
      setError(msg.includes('Too many') ? COPY.form.rateLimit : msg)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div
        id={id}
        role="status"
        aria-live="polite"
        style={{
          padding: '24px', borderRadius: 14, background: '#fff', border: `1px solid ${M.line}`,
          textAlign: 'center', fontSize: 15, fontWeight: 600, color: '#000',
        }}
      >
        {COPY.form.success}
      </div>
    )
  }

  return (
    <form
      id={id}
      onSubmit={handleSubmit}
      className="zdb-connect-form"
      style={{
        position: 'relative',
        padding: '24px', borderRadius: 14, background: '#fff', border: `1px solid ${M.line}`,
        display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left',
      }}
    >
      <div className="zdb-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label htmlFor="ent-first" style={labelStyle}>First name</label>
          <input id="ent-first" required value={firstName} onChange={(e) => setFirstName(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label htmlFor="ent-last" style={labelStyle}>Last name</label>
          <input id="ent-last" required value={lastName} onChange={(e) => setLastName(e.target.value)} style={inputStyle} />
        </div>
      </div>
      <div>
        <label htmlFor="ent-email" style={labelStyle}>Work email</label>
        <input id="ent-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
      </div>
      <div>
        <label htmlFor="ent-company" style={labelStyle}>Company</label>
        <input id="ent-company" required value={company} onChange={(e) => setCompany(e.target.value)} style={inputStyle} />
      </div>
      <div>
        <label htmlFor="ent-position" style={labelStyle}>Role / title (optional)</label>
        <input id="ent-position" value={position} onChange={(e) => setPosition(e.target.value)} style={inputStyle} />
      </div>
      <div>
        <label htmlFor="ent-website" style={labelStyle}>Company website</label>
        <input id="ent-website" required value={website} onChange={(e) => setWebsite(e.target.value)} placeholder={COPY.form.websiteHint} style={inputStyle} />
      </div>
      <input
        type="text"
        name="botcheck"
        value={botcheck}
        onChange={(e) => setBotcheck(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, width: 0 }}
      />
      {error && (
        <p style={{ margin: 0, fontSize: 13, color: '#b91c1c', fontWeight: 600 }} role="alert">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="zdb-connect-submit"
        style={{
          marginTop: 4, padding: '13px 20px', borderRadius: 10, border: 'none', cursor: loading ? 'wait' : 'pointer',
          background: `linear-gradient(135deg, ${BRAND} 0%, #ea580c 100%)`, color: '#fff',
          fontWeight: 700, fontSize: 15, opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Sending…' : "Let's connect"}
      </button>
    </form>
  )
}
