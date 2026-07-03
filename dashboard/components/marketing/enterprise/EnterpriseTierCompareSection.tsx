import Link from 'next/link'
import { COPY } from './enterprise-copy'
import { M, container, h2, lead, sectionTitle, primaryBtn, outlineBtn } from '../marketing-theme'
import { BRAND } from '@/components/brand'

type Props = {
  onConnectClick: () => void
}

export function EnterpriseTierCompareSection({ onConnectClick }: Props) {
  const { openCore, enterprise } = COPY.tierCompare

  return (
    <section className="zdb-section" style={{ padding: '88px 40px', background: M.wash }}>
      <div style={container(1000)}>
        <p style={sectionTitle}>{COPY.tierCompare.sectionTitle}</p>
        <h2 style={h2}>{COPY.tierCompare.h2}</h2>
        <p style={lead}>{COPY.tierCompare.lead}</p>

        <div className="zdb-tier-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: '28px 24px', border: `1px solid ${M.line}`,
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: BRAND, marginBottom: 8, letterSpacing: 0.5 }}>
              {openCore.label}
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 16px', color: '#000' }}>{openCore.title}</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {openCore.features.map((f) => (
                <li key={f} style={{ fontSize: 14, color: '#000', fontWeight: 500, display: 'flex', gap: 8 }}>
                  <span style={{ color: BRAND, fontWeight: 800 }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/signup" style={outlineBtn}>{openCore.cta}</Link>
          </div>

          <div style={{
            background: '#fff', borderRadius: 16, padding: '28px 24px', border: `2px solid ${BRAND}`,
            boxShadow: '0 12px 40px rgba(249,115,22,0.1)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: BRAND, marginBottom: 8, letterSpacing: 0.5 }}>
              {enterprise.label}
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 16px', color: '#000' }}>{enterprise.title}</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {enterprise.features.map((f) => (
                <li key={f} style={{ fontSize: 14, color: '#000', fontWeight: 500, display: 'flex', gap: 8 }}>
                  <span style={{ color: BRAND, fontWeight: 800 }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <button type="button" onClick={onConnectClick} style={{ ...primaryBtn, cursor: 'pointer', border: 'none' }}>
              {enterprise.cta}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
