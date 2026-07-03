import Link from 'next/link'
import { COPY, INTEGRATION_SNIPPET, LOG_POINTS } from './enterprise-copy'
import { M, container, h2, lead, sectionTitle, card } from '../marketing-theme'
import { BRAND } from '@/components/brand'

export function EnterpriseVpcDeploySection() {
  return (
    <section className="zdb-section" style={{ padding: '88px 40px', background: '#fff' }}>
      <div style={container(960)}>
        <p style={sectionTitle}>{COPY.vpcDeploy.sectionTitle}</p>
        <h2 style={h2}>{COPY.vpcDeploy.h2}</h2>
        <p style={lead}>{COPY.vpcDeploy.lead}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
          {COPY.vpcDeploy.points.map((p) => (
            <div key={p.title} style={{ ...card, padding: '20px 22px' }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: '#000' }}>{p.title}</div>
              <div style={{ fontSize: 14, lineHeight: 1.65, color: '#000', fontWeight: 500 }}>{p.body}</div>
            </div>
          ))}
        </div>

        <div className="zdb-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
          <div style={{ ...card, padding: '22px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: BRAND, marginBottom: 12, letterSpacing: 0.5 }}>
              WEEK TIMELINE
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {COPY.vpcDeploy.timeline.map((t) => (
                <div key={t.day} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: BRAND, minWidth: 52 }}>{t.day}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#000' }}>{t.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ ...card, padding: '22px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: BRAND, marginBottom: 12, letterSpacing: 0.5 }}>
              INTEGRATION (YOUR CI/CD)
            </div>
            <pre style={{
              margin: '0 0 14px', padding: '12px 14px', borderRadius: 10, background: M.wash,
              border: `1px solid ${M.line}`, fontSize: 11, lineHeight: 1.55, overflowX: 'auto', color: '#000',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            }}>
              {INTEGRATION_SNIPPET}
            </pre>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#000', marginBottom: 8 }}>Five log points per conversation:</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: '#000', fontWeight: 500 }}>
              {LOG_POINTS.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        </div>

        <p style={{ textAlign: 'center', margin: 0 }}>
          <Link href="/trust#deployment" style={{ color: BRAND, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
            {COPY.vpcDeploy.trustLink} →
          </Link>
        </p>
      </div>
    </section>
  )
}
