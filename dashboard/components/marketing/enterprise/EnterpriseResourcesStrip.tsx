import Link from 'next/link'
import { TECHNICAL_LINKS } from './enterprise-copy'
import { M, container, sectionTitle, card } from '../marketing-theme'

export function EnterpriseResourcesStrip() {
  return (
    <section className="zdb-section" style={{ padding: '64px 40px 88px', background: '#fff', borderTop: `1px solid ${M.line}` }}>
      <div style={container(1000)}>
        <p style={sectionTitle}>Technical resources</p>
        <h2 style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', margin: '0 0 28px', color: '#000' }}>
          For engineering and security review
        </h2>
        <div className="zdb-resource-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
        }}>
          {TECHNICAL_LINKS.map((link) => {
            const inner = (
              <>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#000', marginBottom: 4 }}>{link.label}</div>
                <div style={{ fontSize: 12, color: '#444', lineHeight: 1.5, fontWeight: 500 }}>{link.desc}</div>
              </>
            )
            const boxStyle = { ...card, padding: '16px 18px', display: 'block', textDecoration: 'none' as const }

            if ('external' in link && link.external) {
              return (
                <a key={link.label} href={link.href} target="_blank" rel="noreferrer" style={boxStyle}>
                  {inner}
                </a>
              )
            }
            return (
              <Link key={link.label} href={link.href} style={boxStyle}>
                {inner}
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
