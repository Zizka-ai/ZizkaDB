'use client'

import { COPY } from './enterprise-copy'
import { M, primaryBtn, violetBtn } from '../marketing-theme'
import { BRAND } from '@/components/brand'

type Props = {
  onConnectClick: () => void
  onBookDemo: () => void
}

export function EnterpriseHeroSection({ onConnectClick, onBookDemo }: Props) {
  return (
    <section
      className="zdb-section"
      style={{
        padding: '80px 40px 72px',
        background: M.heroBg,
        position: 'relative',
        overflow: 'hidden',
        color: '#fff',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: M.heroGlowOrange, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, background: M.heroGlowBlue, pointerEvents: 'none' }} />
      <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'inline-block', marginBottom: 20, padding: '6px 14px', borderRadius: 100,
          fontSize: 11, fontWeight: 700, letterSpacing: 0.8,
          background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.35)', color: BRAND,
        }}>
          {COPY.hero.eyebrow}
        </div>
        <h1 className="zdb-hero-title" style={{
          fontSize: 44, fontWeight: 800, lineHeight: 1.12, margin: '0 0 20px', letterSpacing: -0.8,
        }}>
          {COPY.hero.h1}
        </h1>
        <p className="zdb-hero-value" style={{
          fontSize: 18, fontWeight: 500, lineHeight: 1.65, margin: '0 auto 32px', maxWidth: 620,
          color: 'rgba(255,255,255,0.88)',
        }}>
          {COPY.hero.subhead}
        </p>
        <div className="zdb-hero-btns" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={onConnectClick} style={{ ...primaryBtn, cursor: 'pointer', border: 'none' }}>
            {COPY.hero.connectCta}
          </button>
          <button type="button" onClick={onBookDemo} style={{ ...violetBtn, cursor: 'pointer' }}>
            {COPY.hero.demoCta}
          </button>
        </div>
      </div>
    </section>
  )
}
