import Link from 'next/link'
import { BrandLogo } from '@/components/BrandLogo'

const GITHUB_URL = 'https://github.com/Zizka-ai/ZizkaDB'

const LINKS: [string, string][] = [
  ['Docs', '/docs'],
  ['Enterprise', '/enterprise'],
  ['Pricing', '/#pricing'],
  ['Trust', '/trust'],
  ['GitHub', GITHUB_URL],
  ['Sign in', '/login'],
]

export function MarketingFooter() {
  return (
    <footer
      className="zdb-footer"
      style={{
        borderTop: '1px solid #e2e8f0',
        padding: '32px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 13,
        color: '#000',
        background: '#fff',
        flexWrap: 'wrap',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <BrandLogo variant="mark" showWordmark={false} href="/" />
        <span style={{ fontWeight: 700, color: '#000' }}>ZizkaDB</span>
        <span style={{ color: '#000' }}>·</span>
        <span style={{ fontWeight: 500, color: '#000' }}>Open source operational database for AI agents</span>
      </div>
      <div className="zdb-footer-links" style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
        {LINKS.map(([label, href]) =>
          href.startsWith('http') ? (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#000', textDecoration: 'none', fontWeight: 500 }}
            >
              {label}
            </a>
          ) : (
            <Link key={label} href={href} style={{ color: '#000', textDecoration: 'none', fontWeight: 500 }}>
              {label}
            </Link>
          ),
        )}
        <Link href="/signup" style={{ color: '#000', fontWeight: 700, textDecoration: 'none' }}>
          Start free
        </Link>
      </div>
    </footer>
  )
}
