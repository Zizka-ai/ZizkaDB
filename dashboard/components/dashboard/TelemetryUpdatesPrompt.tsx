'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { getSessionEmail } from '@/lib/auth'
import { getOrCreateInstallId, submitTelemetryUpdates } from '@/lib/telemetry-updates'
import { colors } from '@/lib/design-tokens'

const DISMISS_KEY = 'zizkadb_telemetry_updates_dismissed_at'
const SUBMITTED_KEY = 'zizkadb_telemetry_updates_submitted_at'

function nowMs() {
  return Date.now()
}

function parseMs(v: string | null): number | null {
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Optional email opt-in for SDK/security release notes (dashboard visitors). */
export function TelemetryUpdatesPrompt() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (getSessionEmail()) return

    const dismissed = parseMs(window.localStorage.getItem(DISMISS_KEY))
    const submitted = parseMs(window.localStorage.getItem(SUBMITTED_KEY))
    if (submitted) return
    if (dismissed && nowMs() - dismissed < 14 * 24 * 60 * 60 * 1000) return

    timer.current = window.setTimeout(() => setOpen(true), 8000)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  const styles = useMemo(
    () => ({
      wrap: {
        position: 'fixed' as const,
        bottom: 20,
        right: 20,
        zIndex: 1200,
        width: 'min(420px, calc(100vw - 32px))',
        background: colors.surfaceAlt,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        padding: '16px 18px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
        display: open ? 'block' : 'none',
      },
      title: { fontSize: 14, fontWeight: 700, color: colors.textStrong, marginBottom: 6 },
      body: { fontSize: 13, color: colors.textMuted, lineHeight: 1.5, marginBottom: 12 },
      row: { display: 'flex', gap: 8, flexWrap: 'wrap' as const },
      input: {
        flex: '1 1 180px',
        padding: '9px 11px',
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        color: colors.textStrong,
        fontSize: 13,
        outline: 'none',
      },
      primary: {
        padding: '9px 12px',
        borderRadius: 10,
        border: 'none',
        background: '#f97316',
        color: '#111',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        opacity: busy ? 0.7 : 1,
      },
      ghost: {
        padding: '9px 12px',
        borderRadius: 10,
        border: `1px solid ${colors.border}`,
        background: 'transparent',
        color: colors.textMuted,
        fontSize: 13,
        cursor: 'pointer',
      },
      err: { marginTop: 8, fontSize: 12, color: '#f87171' },
    }),
    [open, busy],
  )

  const dismiss = () => {
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
      await submitTelemetryUpdates({
        email: email.trim(),
        install_id: getOrCreateInstallId(),
        sdk: 'dashboard',
      })
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
    <div style={styles.wrap} role="dialog" aria-label="Optional product updates">
      <div style={styles.title}>Get SDK &amp; security updates?</div>
      <div style={styles.body}>
        Optional. We&apos;ll email release notes and breaking-change alerts. You can skip — the dashboard works either way.
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
        <button type="button" style={styles.primary} disabled={busy || email.trim().length < 3} onClick={submit}>
          Subscribe
        </button>
        <button type="button" style={styles.ghost} disabled={busy} onClick={dismiss}>
          Skip
        </button>
      </div>
      {err && <div style={styles.err}>{err}</div>}
    </div>
  )
}
