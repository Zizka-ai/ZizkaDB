import { COPY } from './enterprise-copy'
import { M, container, h2, lead, sectionTitle, card } from '../marketing-theme'
import { BRAND } from '@/components/brand'

export function EnterprisePlatformFeaturesSection() {
  return (
    <section className="zdb-section" style={{ padding: '88px 40px', background: M.wash }}>
      <div style={container(1000)}>
        <p style={sectionTitle}>{COPY.platform.sectionTitle}</p>
        <h2 style={h2}>{COPY.platform.h2}</h2>
        <p style={lead}>{COPY.platform.lead}</p>

        <div className="zdb-feature-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24,
        }}>
          {COPY.platform.features.map((f) => (
            <div key={f.title} style={{ ...card, padding: '22px 20px' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#000', marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#000', fontWeight: 500 }}>{f.body}</div>
            </div>
          ))}
        </div>

        <p style={{
          textAlign: 'center', fontSize: 13, color: '#000', fontWeight: 500, lineHeight: 1.6,
          maxWidth: 640, margin: '0 auto',
        }}>
          {COPY.platform.footnote}
        </p>
      </div>
    </section>
  )
}
