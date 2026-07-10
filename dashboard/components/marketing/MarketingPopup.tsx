'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BRAND } from '@/components/brand'
import { ghostBtn, primaryBtn, tealBtn, violetBtn } from './marketing-theme'
import { useLanding } from './LandingContext'

const GITHUB_URL = 'https://github.com/Zizka-ai/ZizkaDB'
const DISMISS_KEY = 'zdb_popup_dismissed_at'
const DISMISS_DAYS = 7

export function MarketingPopup() {
  const { segment, track, setDemoOpen } = useLanding()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (raw) {
      const t = Number(raw)
      if (!Number.isNaN(t) && Date.now() - t < DISMISS_DAYS * 86400000) return
    }

    const timer = window.setTimeout(() => {
      setVisible(true)
      track('popup_shown', { segment })
    }, 30000)

    return () => window.clearTimeout(timer)
  }, [segment, track])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    track('popup_dismiss', { segment })
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        maxWidth: 420, width: '100%', padding: '28px 26px', borderRadius: 18,
        background: '#fff', boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
      }} role="dialog" aria-modal="true">
        <button type="button" onClick={dismiss} aria-label="Close"
          style={{
            float: 'right', border: 'none', background: 'transparent', fontSize: 20,
            cursor: 'pointer', color: '#64748b', lineHeight: 1,
          }}>×</button>

        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: BRAND, margin: '0 0 8px' }}>
          Operational database for AI agents
        </p>
        <h3 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 10px', color: '#000', lineHeight: 1.25 }}>
          {segment === 'solo' && 'Ready to self-host?'}
          {segment === 'managed' && 'Start free on managed cloud'}
          {segment === 'enterprise' && 'Talk to us about your fleet'}
        </h3>
        <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, margin: '0 0 20px' }}>
          {segment === 'solo' && 'Clone ZizkaDB on GitHub or copy MCP config into Cursor — free forever.'}
          {segment === 'managed' && 'Sign up in minutes. First event in your dashboard — no card required.'}
          {segment === 'enterprise' && 'Book 15 minutes with the founder. We will map replay, retention, and rollout.'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {segment === 'solo' && (
            <a href={GITHUB_URL} target="_blank" rel="noreferrer"
              onClick={() => { track('github_click', { source: 'popup' }); dismiss() }}
              style={{ ...tealBtn, justifyContent: 'center' }}>
              Open GitHub →
            </a>
          )}
          {segment === 'managed' && (
            <Link href="/signup" onClick={() => { track('cta_click', { cta: 'signup', source: 'popup' }); dismiss() }}
              style={{ ...primaryBtn, justifyContent: 'center' }}>
              Start free →
            </Link>
          )}
          {segment === 'enterprise' && (
            <button type="button"
              onClick={() => { track('cta_click', { cta: 'book_demo', source: 'popup' }); setDemoOpen(true); dismiss() }}
              style={{ ...violetBtn, cursor: 'pointer', justifyContent: 'center' }}>
              Book a demo
            </button>
          )}
          <button type="button" onClick={dismiss} style={{
            ...ghostBtn, justifyContent: 'center', color: '#64748b',
            background: '#f8fafc', border: '1px solid #e2e8f0',
          }}>
            No thanks
          </button>
        </div>
      </div>
    </div>
  )
}
