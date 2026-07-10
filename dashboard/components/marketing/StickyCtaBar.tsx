'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BRAND } from '@/components/brand'
import { primaryBtn, tealBtn, violetBtn } from './marketing-theme'
import { useLanding } from './LandingContext'

const GITHUB_URL = 'https://github.com/Zizka-ai/ZizkaDB'

export function StickyCtaBar() {
  const { segment, track, setDemoOpen } = useLanding()
  const [show, setShow] = useState(false)

  useEffect(() => {
    function onScroll() {
      setShow(window.scrollY > 480)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 90,
      padding: '12px 20px', background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
        Operational database for AI agents —
        {segment === 'solo' && ' self-host free'}
        {segment === 'managed' && ' start on managed cloud'}
        {segment === 'enterprise' && ' book a walkthrough'}
      </span>
      {segment === 'solo' && (
        <a href={GITHUB_URL} target="_blank" rel="noreferrer"
          onClick={() => track('github_click', { source: 'sticky' })}
          style={{ ...tealBtn, fontSize: 13, padding: '10px 18px' }}>
          GitHub →
        </a>
      )}
      {segment === 'managed' && (
        <Link href="/signup" onClick={() => track('cta_click', { cta: 'signup', source: 'sticky' })}
          style={{ ...primaryBtn, fontSize: 13, padding: '10px 18px' }}>
          Start free →
        </Link>
      )}
      {segment === 'enterprise' && (
        <button type="button"
          onClick={() => { track('cta_click', { cta: 'book_demo', source: 'sticky' }); setDemoOpen(true) }}
          style={{ ...violetBtn, fontSize: 13, padding: '10px 18px', cursor: 'pointer' }}>
          Book demo
        </button>
      )}
    </div>
  )
}
