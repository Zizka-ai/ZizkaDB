import Link from 'next/link'
import type { CSSProperties } from 'react'
import { COPY } from './enterprise-copy'
import { M, container, h2, lead, sectionTitle, card } from '../marketing-theme'
import { BRAND } from '@/components/brand'

const th: CSSProperties = {
  textAlign: 'left',
  padding: '10px 14px',
  fontSize: 12,
  fontWeight: 700,
  color: '#666',
  borderBottom: `1px solid ${M.line}`,
  background: M.wash,
}

const td: CSSProperties = {
  padding: '12px 14px',
  fontSize: 14,
  color: '#000',
  fontWeight: 500,
  borderBottom: `1px solid ${M.line}`,
  verticalAlign: 'top',
}

export function EnterpriseWhatIsSection() {
  const { whatIs } = COPY

  return (
    <section id="what-is" className="zdb-section zdb-section-anchor" style={{ padding: '88px 40px', background: M.wash, scrollMarginTop: 72 }}>
      <div style={container(900)}>
        <p style={sectionTitle}>{whatIs.sectionTitle}</p>
        <h2 style={h2}>{whatIs.h2}</h2>
        <p style={lead}>{whatIs.lead}</p>

        <div style={{ ...card, padding: 0, overflow: 'hidden', marginTop: 32 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Layer</th>
                <th style={th}>Role</th>
                <th style={th}>Examples</th>
              </tr>
            </thead>
            <tbody>
              {whatIs.table.map(([layer, role, examples]) => (
                <tr key={layer}>
                  <td style={{ ...td, fontWeight: 700 }}>{layer}</td>
                  <td style={td}>{role}</td>
                  <td style={td}>{examples}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ marginTop: 24, marginBottom: 0, fontSize: 14, fontWeight: 600 }}>
          <Link href={whatIs.linkHref} style={{ color: BRAND, textDecoration: 'none' }}>
            {whatIs.linkLabel} →
          </Link>
        </p>
      </div>
    </section>
  )
}
