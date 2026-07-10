'use client'

import Link from 'next/link'
import Image from 'next/image'
import { BRAND } from '@/components/brand'
import { SessionReplayDemo } from './SessionReplayDemo'
import { SegmentPicker, segmentSubline } from './SegmentPicker'
import { M, ghostBtn, primaryBtn, tealBtn, violetBtn } from './marketing-theme'
import { useLanding } from './LandingContext'

const GITHUB_URL = 'https://github.com/Zizka-ai/ZizkaDB'

export function LandingHero() {
  const { segment, track, setDemoOpen } = useLanding()
  const subline = segmentSubline(segment)

  return (
    <section className="zdb-hero-section" style={{
      padding: '48px 40px 72px',
      background: M.heroBg,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: M.heroGlowOrange, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, background: M.heroGlowBlue, pointerEvents: 'none' }} />

      <div className="zdb-hero-grid" style={{
        maxWidth: 1120, margin: '0 auto', position: 'relative', zIndex: 1,
        display: 'grid', gridTemplateColumns: '1fr 1.05fr', gap: 48, alignItems: 'center',
      }}>
        <div>
          <div style={{ marginBottom: 24 }}>
            <SegmentPicker />
          </div>

          <h1 className="zdb-hero-title" style={{
            fontSize: 'clamp(34px, 4.2vw, 52px)', fontWeight: 800, lineHeight: 1.08,
            margin: '0 0 16px', letterSpacing: -1, color: '#fff',
          }}>
            Operational Database For AI Agents
          </h1>

          <p className="zdb-hero-value" style={{
            fontSize: 19, fontWeight: 600, color: '#fff', margin: '0 0 10px', lineHeight: 1.45,
          }}>
            Fix failures in minutes — not after customer complaints.
          </p>

          <p style={{
            fontSize: 15, color: 'rgba(255,255,255,0.55)', margin: '0 0 28px', lineHeight: 1.65, maxWidth: 480,
          }}>
            {subline}
          </p>

          <div className="zdb-hero-btns" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
            {segment === 'solo' && (
              <>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => track('github_click', { source: 'hero' })}
                  style={tealBtn}
                >
                  View on GitHub →
                </a>
                <Link href="/signup" onClick={() => track('cta_click', { cta: 'signup', source: 'hero_solo' })} style={ghostBtn}>
                  Try managed cloud
                </Link>
              </>
            )}
            {segment === 'managed' && (
              <>
                <Link href="/signup" onClick={() => track('cta_click', { cta: 'signup', source: 'hero' })} style={primaryBtn}>
                  Start free →
                </Link>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => track('github_click', { source: 'hero' })}
                  style={ghostBtn}
                >
                  Self-host on GitHub
                </a>
              </>
            )}
            {segment === 'enterprise' && (
              <>
                <button
                  type="button"
                  onClick={() => { track('cta_click', { cta: 'book_demo', source: 'hero' }); setDemoOpen(true) }}
                  style={{ ...violetBtn, cursor: 'pointer' }}
                >
                  Book a demo
                </button>
                <Link href="/signup" onClick={() => track('cta_click', { cta: 'signup', source: 'hero_enterprise' })} style={ghostBtn}>
                  Start free trial
                </Link>
              </>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 14px',
              borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <Image src="/aws-startups.svg" alt="AWS for Startups" width={52} height={22} style={{ height: 22, width: 'auto' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
                Supported by AWS for Startups
              </span>
            </div>
            {['Open source', 'No card to start', 'EU-based'].map(t => (
              <span key={t} style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{t}</span>
            ))}
          </div>
        </div>

        <div className="zdb-hero-demo">
          <SessionReplayDemo />
        </div>
      </div>
    </section>
  )
}
