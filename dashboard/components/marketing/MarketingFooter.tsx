import Link from 'next/link'
import { BrandLogo } from '@/components/BrandLogo'
import { ZIZKADB_COMPANY, ZIZKADB_FOOTER_COLUMNS, type FooterLink } from './footer-config'
import { M } from './marketing-theme'

const YEAR = new Date().getFullYear()

function FooterAnchor({ link }: { link: FooterLink }) {
  const style = {
    color: '#ffffff',
    textDecoration: 'none' as const,
    fontSize: 14,
    lineHeight: 1.5,
    display: 'inline-block' as const,
  }

  if (link.external || link.href.startsWith('http') || link.href.startsWith('mailto:')) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" style={style}>
        {link.label}
      </a>
    )
  }

  return (
    <Link href={link.href} style={style}>
      {link.label}
    </Link>
  )
}

export function MarketingFooter() {
  return (
    <footer className="zdb-footer" style={{ background: M.bg, color: '#ffffff' }}>
      <div
        className="zdb-footer-grid"
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '56px 40px 40px',
          display: 'grid',
          gridTemplateColumns: '1.4fr repeat(3, 1fr)',
          gap: 40,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <BrandLogo variant="mark" showWordmark={false} href="/" />
            <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: -0.3 }}>ZizkaDB</span>
          </div>
          <p style={{ margin: '0 0 20px', fontSize: 14, lineHeight: 1.65, color: '#ffffff', maxWidth: 280 }}>
            Don't Observe — Audit your AI Agent. Causal lineage, time travel, and drift for production agents.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a
              href={ZIZKADB_COMPANY.zizkaAiUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 14, color: '#ffffff', textDecoration: 'none' }}
            >
              zizka.ai →
            </a>
          </div>
        </div>

        {ZIZKADB_FOOTER_COLUMNS.map((col) => (
          <div key={col.title}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.9,
                textTransform: 'uppercase',
                color: '#ffffff',
                marginBottom: 16,
              }}
            >
              {col.title}
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {col.links.map((link) => (
                <li key={link.label}>
                  <FooterAnchor link={link} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div
          className="zdb-footer-meta"
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: '20px 40px 28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: 12,
            color: '#ffffff',
          }}
        >
          <span>© {YEAR} {ZIZKADB_COMPANY.name}</span>
          <span style={{ textAlign: 'right' }}>
            {ZIZKADB_COMPANY.location} · {ZIZKADB_COMPANY.taxId}
          </span>
        </div>
      </div>
    </footer>
  );
}
