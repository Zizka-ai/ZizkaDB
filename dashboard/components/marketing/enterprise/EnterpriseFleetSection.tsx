import dynamic from 'next/dynamic'
import { COPY } from './enterprise-copy'
import { M, container, h2, lead, sectionTitle, card } from '../marketing-theme'
import { BRAND } from '@/components/brand'

const SessionReplayDemo = dynamic(
  () => import('../SessionReplayDemo').then((m) => m.SessionReplayDemo),
  {
    ssr: false,
    loading: () => (
      <div style={{
        height: 320, borderRadius: 16, background: M.wash, border: `1px solid ${M.line}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: 14,
      }}>
        Loading preview…
      </div>
    ),
  },
)

export function EnterpriseFleetSection() {
  const { driftBands } = COPY.fleet

  return (
    <section id="fleet" className="zdb-section zdb-section-anchor" style={{ padding: '88px 40px', background: '#fff', scrollMarginTop: 72 }}>
      <div style={container(980)}>
        <p style={sectionTitle}>{COPY.fleet.sectionTitle}</p>
        <h2 style={h2}>{COPY.fleet.h2}</h2>
        <p style={lead}>{COPY.fleet.lead}</p>

        <div className="zdb-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {COPY.fleet.bullets.map((b) => (
              <div key={b.title} style={{ ...card, padding: '20px 22px' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#000', marginBottom: 6 }}>{b.title}</div>
                <div style={{ fontSize: 14, color: '#000', lineHeight: 1.6, fontWeight: 500 }}>{b.body}</div>
              </div>
            ))}
            <div style={{
              padding: '16px 18px', borderRadius: 12, background: '#fff7ed',
              border: `1px solid ${BRAND}44`, fontSize: 13, lineHeight: 1.6, fontWeight: 500, color: '#000',
            }}>
              {COPY.fleet.driftNote}
            </div>
            <div style={{ ...card, padding: '18px 20px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#000', marginBottom: 10 }}>{driftBands.title}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {driftBands.bands.map((b) => (
                  <span key={b.label} style={{
                    fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 8,
                    background: M.wash, border: `1px solid ${M.line}`, color: '#000',
                  }}>
                    {b.label} · {b.range}
                  </span>
                ))}
              </div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: '#666', fontWeight: 500 }}>
                {driftBands.requirement}
              </p>
            </div>
          </div>
          <div>
            <SessionReplayDemo />
            <p style={{ textAlign: 'center', fontSize: 12, color: '#666', marginTop: 12, fontWeight: 500 }}>
              {COPY.fleet.demoCaption}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
