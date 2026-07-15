'use client'

import { useEffect, useRef, useState } from 'react'
import { M, violetBtn } from './marketing-theme'

const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL ?? 'https://calendly.com/founder-zizka/15-minutes'

type Props = {
  open: boolean
  onClose: () => void
}

declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (opts: { url: string; parentElement: HTMLElement }) => void
    }
  }
}

function loadCalendlyScript(): Promise<void> {
  if (window.Calendly) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="calendly.com/assets/external/widget.js"]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Calendly failed to load')))
      if (window.Calendly) resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://assets.calendly.com/assets/external/widget.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Calendly failed to load'))
    document.head.appendChild(script)
  })
}

export function CalendlyBookModal({ open, onClose }: Props) {
  const embedRef = useRef<HTMLDivElement>(null)
  const [booked, setBooked] = useState(false)
  const [loadErr, setLoadErr] = useState('')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !booked) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, booked])

  useEffect(() => {
    if (!open) return

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== 'https://calendly.com') return
      if (e.data?.event === 'calendly.event_scheduled') {
        setBooked(true)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [open])

  useEffect(() => {
    if (!open) {
      setBooked(false)
      setLoadErr('')
      return
    }
    if (booked) return

    let cancelled = false
    setLoadErr('')

    loadCalendlyScript()
      .then(() => {
        if (cancelled || !embedRef.current) return
        embedRef.current.innerHTML = ''
        window.Calendly?.initInlineWidget({
          url: CALENDLY_URL,
          parentElement: embedRef.current,
        })
      })
      .catch(() => {
        if (!cancelled) setLoadErr('Could not load the scheduler. Try again or open Calendly in a new tab.')
      })

    return () => { cancelled = true }
  }, [open, booked])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-demo-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={booked ? onClose : undefined}
    >
      <div
        style={{
          width: '100%', maxWidth: booked ? 440 : 520, background: '#fff', borderRadius: 16,
          border: `1px solid ${M.line}`, boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {booked ? (
          <div style={{ padding: '32px 28px', textAlign: 'center' }}>
            <h2 id="book-demo-title" style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 800, color: '#000' }}>
              You&apos;re booked
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: 15, fontWeight: 600, color: '#000', lineHeight: 1.55 }}>
              Thank you for booking a demo call with ZizkaDB. A confirmation email has been sent.
            </p>
            <button type="button" onClick={onClose} style={{ ...violetBtn, border: 'none', cursor: 'pointer' }}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div style={{ padding: '18px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <h2 id="book-demo-title" style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#000' }}>
                Book a 15-minute demo
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                style={{
                  background: 'none', border: 'none', fontSize: 22, lineHeight: 1,
                  color: '#000', cursor: 'pointer', padding: 4,
                }}
              >
                ×
              </button>
            </div>
            {loadErr ? (
              <div style={{ padding: '16px 20px 24px' }}>
                <p style={{ margin: '0 0 16px', fontSize: 14, color: '#b91c1c', fontWeight: 600 }}>{loadErr}</p>
                <a href={CALENDLY_URL} target="_blank" rel="noreferrer" style={{ ...violetBtn, display: 'inline-flex' }}>
                  Open Calendly →
                </a>
              </div>
            ) : (
              <div ref={embedRef} style={{ minWidth: 320, height: 680 }} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
