import Link from 'next/link'
import type { ReactNode } from 'react'
import { SiteNav } from '@/components/SiteNav'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'
import { MarketingPageStyles } from '@/components/marketing/MarketingPageStyles'

type LegalDocumentLayoutProps = {
  title: string
  updated: string
  children: ReactNode
}

export function LegalDocumentLayout({ title, updated, children }: LegalDocumentLayoutProps) {
  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#111', background: '#fff', minHeight: '100vh' }}>
      <MarketingPageStyles />
      <SiteNav />

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#888', margin: '0 0 8px' }}>
          Legal
        </p>
        <h1 style={{ fontSize: 34, fontWeight: 800, margin: '0 0 8px', letterSpacing: -0.5 }}>{title}</h1>
        <p style={{ fontSize: 14, color: '#666', margin: '0 0 40px' }}>Last updated: {updated}</p>
        {children}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid #eee' }}>
          <Link href="/" style={{ fontSize: 14, color: '#111', fontWeight: 500, textDecoration: 'none' }}>
            ← Back to ZizkaDB
          </Link>
        </div>
      </main>

      <MarketingFooter />
    </div>
  )
}

export const legalStyles = {
  h2: { fontSize: 18, fontWeight: 700, color: '#111', margin: '36px 0 12px' } as const,
  p: { fontSize: 15, color: '#444', lineHeight: 1.75, margin: '0 0 14px' } as const,
  ul: { margin: '0 0 14px', paddingLeft: 22, fontSize: 15, color: '#444', lineHeight: 1.8 } as const,
  li: { marginBottom: 6 } as const,
  a: { color: '#111', fontWeight: 500 } as const,
}
