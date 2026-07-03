import Link from 'next/link'
import type { CSSProperties } from 'react'
import { BrandLogo } from './BrandLogo'
import { brandCtaStyle } from './brand'

export type SiteNavActive = 'docs' | 'community' | 'trust' | 'explorer' | 'home' | 'enterprise'

type SiteNavProps = {
  active?: SiteNavActive
  /** e.g. "Docs" shows as "ZizkaDB / Docs" */
  suffix?: string
}

const linkStyle = (on: boolean): CSSProperties => ({
  fontSize: 14,
  color: '#000',
  fontWeight: on ? 600 : 400,
  textDecoration: 'none',
})

const enterpriseLinkStyle = (on: boolean): CSSProperties => ({
  fontSize: 14,
  fontWeight: 600,
  color: '#000',
  textDecoration: 'none',
  padding: '6px 12px',
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: on ? '#f8fafc' : 'transparent',
})

export function SiteNav({ active, suffix }: SiteNavProps) {
  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        height: 56,
        borderBottom: '1px solid #f0f0f0',
        position: 'sticky',
        top: 0,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(8px)',
        zIndex: 100,
      }}
    >
      <BrandLogo suffix={suffix} />

      <div className="site-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <Link href="/docs" style={linkStyle(active === 'docs')}>Docs</Link>
        <Link href="/community" style={linkStyle(active === 'community')}>Community</Link>
        <a href="/swagger" style={linkStyle(active === 'explorer')}>API Explorer</a>
        <Link href="/enterprise" style={enterpriseLinkStyle(active === 'enterprise')}>Enterprise</Link>
        <Link href="/login" style={{
          fontSize: 14, fontWeight: 500, color: '#000', textDecoration: 'none',
          padding: '7px 16px', border: '1px solid #ddd', borderRadius: 8,
        }}>
          Sign in
        </Link>
        <Link href="/signup" style={brandCtaStyle}>Start free →</Link>
      </div>

      <div className="site-nav-cta" style={{ display: 'none', alignItems: 'center', gap: 8 }}>
        <Link href="/enterprise" style={{
          fontSize: 13, fontWeight: 600, color: '#111', textDecoration: 'none',
          padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 8,
        }}>
          Enterprise
        </Link>
        <Link href="/login" style={{
          fontSize: 13, fontWeight: 500, color: '#111', textDecoration: 'none',
          padding: '6px 12px', border: '1px solid #ddd', borderRadius: 8,
        }}>
          Sign in
        </Link>
        <Link href="/signup" style={{ ...brandCtaStyle, fontSize: 13, padding: '6px 14px' }}>Start free →</Link>
      </div>
    </nav>
  )
}
