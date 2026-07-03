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

export function EnterpriseCapabilitiesSection() {
  const { capabilities } = COPY

  return (
    <section id="capabilities" className="zdb-section zdb-section-anchor" style={{ padding: '88px 40px', background: M.wash, scrollMarginTop: 72 }}>
      <div style={container(1000)}>
        <p style={sectionTitle}>{capabilities.sectionTitle}</p>
        <h2 style={h2}>{capabilities.h2}</h2>
        <p style={lead}>{capabilities.lead}</p>

        <div className="zdb-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 36 }}>
          <div style={{ ...card, padding: '24px 22px' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px', color: '#000' }}>
              {capabilities.openCore.title}
            </h3>
            <p style={{ fontSize: 13, color: '#666', margin: '0 0 18px', fontWeight: 500 }}>
              {capabilities.openCore.subtitle}
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Capability</th>
                  <th style={th}>API / concept</th>
                </tr>
              </thead>
              <tbody>
                {capabilities.openCore.rows.map(([cap, api]) => (
                  <tr key={cap}>
                    <td style={{ ...td, fontWeight: 600 }}>{cap}</td>
                    <td style={{ ...td, fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{api}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{
            ...card, padding: '24px 22px', border: `2px solid ${BRAND}`,
            boxShadow: '0 12px 40px rgba(249,115,22,0.08)',
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 18px', color: '#000' }}>
              {capabilities.enterprise.title}
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {capabilities.enterprise.items.map((item) => (
                <li key={item} style={{ fontSize: 14, color: '#000', fontWeight: 500, display: 'flex', gap: 8 }}>
                  <span style={{ color: BRAND, fontWeight: 800 }}>✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p style={{
          marginTop: 24, marginBottom: 0, fontSize: 13, lineHeight: 1.6, fontWeight: 500, color: '#666',
        }}>
          {capabilities.footnote}
        </p>
      </div>
    </section>
  )
}
