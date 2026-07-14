'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'

type Choice = 'accepted' | 'declined'

const KEY = 'zizkadb_privacy_consent'

export function CookiePrivacyConsent() {
  const [choice, setChoice] = useState<Choice | null>(null)

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(KEY)
      if (v === 'accepted' || v === 'declined') setChoice(v)
      else setChoice(null)
    } catch {
      setChoice(null)
    }
  }, [])

  const visible = choice === null

  const styles = useMemo(() => {
    const wrap: CSSProperties = {
      position: 'fixed',
      left: 16,
      right: 16,
      bottom: 16,
      zIndex: 2000,
      display: visible ? 'flex' : 'none',
      justifyContent: 'center',
      pointerEvents: visible ? 'auto' : 'none',
    }
    const card: CSSProperties = {
      width: 'min(980px, 100%)',
      background: '#111',
      border: '1px solid #1f1f1f',
      borderRadius: 14,
      padding: '14px 16px',
      color: '#e5e5e5',
      display: 'flex',
      gap: 14,
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
    }
    const text: CSSProperties = {
      fontSize: 13,
      lineHeight: 1.5,
      color: '#e5e5e5',
      flex: '1 1 520px',
    }
    const actions: CSSProperties = { display: 'flex', gap: 10, flex: '0 0 auto' }
    const btn: CSSProperties = {
      border: '1px solid #2a2a2a',
      background: '#0a0a0a',
      color: '#e5e5e5',
      borderRadius: 10,
      padding: '8px 12px',
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer',
    }
    const btnPrimary: CSSProperties = {
      border: '1px solid #f97316',
      background: '#f97316',
      color: '#111',
    }
    const link: CSSProperties = { color: '#a3a3a3', textDecoration: 'underline' }

    return { wrap, card, text, actions, btn, btnPrimary, link }
  }, [visible])

  const decide = (v: Choice) => {
    try {
      window.localStorage.setItem(KEY, v)
    } catch {
      // ignore
    }
    setChoice(v)
  }

  return (
    <div style={styles.wrap} aria-hidden={!visible}>
      <div style={styles.card} role="dialog" aria-label="Cookie and privacy notice">
        <div style={styles.text}>
          <strong style={{ color: '#fff' }}>Cookie and Privacy Consent</strong>
          <div style={{ marginTop: 4, color: '#a3a3a3' }}>
            We use cookies/local storage for essential site functionality and to improve the product. You can accept or
            decline — you’ll still have full access either way.{' '}
            <a href="/privacy" style={styles.link}>
              Privacy policy
            </a>
            .
          </div>
        </div>
        <div style={styles.actions}>
          <button type="button" style={styles.btn} onClick={() => decide('declined')}>
            Decline
          </button>
          <button type="button" style={{ ...styles.btn, ...styles.btnPrimary }} onClick={() => decide('accepted')}>
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}

