'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { submitMarketingSubscription } from '@/lib/marketing'

const DISMISS_KEY = 'zizkadb_marketing_popup_dismissed_at'
const SUBMITTED_KEY = 'zizkadb_marketing_popup_submitted_at'

function nowMs() {
  return Date.now()
}

function parseMs(v: string | null): number | null {
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function MarketingSubscribePopup() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const timer = useRef<number | null>(null)

  useEffect(() => {
    // Show after 15 seconds, unless recently dismissed or already submitted.
    const dismissed = parseMs(window.localStorage.getItem(DISMISS_KEY))
    const submitted = parseMs(window.localStorage.getItem(SUBMITTED_KEY))

    // If already submitted, never show again.
    if (submitted) return

    // If dismissed in last 7 days, don't show again yet.
    if (dismissed && nowMs() - dismissed < 7 * 24 * 60 * 60 * 1000) return

    timer.current = window.setTimeout(() => setOpen(true), 15_000)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  const styles = useMemo(() => {
    return {
      backdrop: {
        position: 'fixed' as const,
        inset: 0,
        zIndex: 1900,
        background: 'rgba(0,0,0,0.55)',
        display: open ? 'flex' : 'none',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      },
      card: {
        width: 'min(560px, 100%)',
        background: '#0d0d0d',
        border: '1px solid #1f1f1f',
        borderRadius: 16,
        padding: '20px 18px',
        color: '#e5e5e5',
        boxShadow: '0 18px 60px rgba(0,0,0,0.55)',
      },
      h: { fontSize: 18, fontWeight: 700, marginBottom: 6, color: '#fff' },
      p: { fontSize: 13.5, color: '#a3a3a3', lineHeight: 1.55, marginBottom: 14 },
      row: { display: 'flex', gap: 10, flexWrap: 'wrap' as const },
      input: {
        flex: '1 1 260px',
        padding: '10px 12px',
        background: '#0a0a0a',
        border: '1px solid #2a2a2a',
        borderRadius: 10,
        color: '#fff',
        fontSize: 14,
        outline: 'none',
      },
      btn: {
        flex: '0 0 auto',
        padding: '10px 14px',
        borderRadius: 10,
        border: '1px solid #f97316',
        background: '#f97316',
        color: '#111',
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
        opacity: busy ? 0.7 : 1,
      },
      err: {
        marginTop: 10,
        padding: '10px 12px',
        background: '#1a0000',
        border: '1px solid #ef444440',
        borderRadius: 10,
        color: '#f87171',
        fontSize: 13,
      },
      small: { marginTop: 10, fontSize: 12, color: '#737373' },
    }
  }, [open, busy])

  const close = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(nowMs()))
    } catch {
      // ignore
    }
    setOpen(false)
  }

  const submit = async () => {
    setBusy(true)
    setErr('')
    try {
      await submitMarketingSubscription({ email: email.trim() })
      try {
        window.localStorage.setItem(SUBMITTED_KEY, String(nowMs()))
      } catch {
        // ignore
      }
      setOpen(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to subscribe')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div
      style={styles.backdrop}
      role="dialog"
      aria-label="Marketing subscription"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div style={styles.card} onMouseDown={(e) => e.stopPropagation()}>
        <div style={styles.h}>Want to learn more about AI Agent Audits?</div>
        <div style={styles.p}>
          Get occasional updates on audits, causal lineage, and self-hosted best practices. No spam.
        </div>

        <div style={styles.row}>
          <input
            style={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            inputMode="email"
            autoComplete="email"
            disabled={busy}
          />
          <button
            type="button"
            style={styles.btn}
            disabled={busy || email.trim().length < 3}
            onClick={submit}
          >
            Subscribe
          </button>
        </div>

        {err && <div style={styles.err}>{err}</div>}

        <div style={styles.small}>Tip: click outside this box to dismiss.</div>
      </div>
    </div>
  )
}

