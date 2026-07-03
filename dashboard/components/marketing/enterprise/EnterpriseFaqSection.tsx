import Link from 'next/link'
import { COPY } from './enterprise-copy'
import { M, container, h2, sectionTitle, card } from '../marketing-theme'
import { BRAND } from '@/components/brand'

export function EnterpriseFaqSection() {
  return (
    <section id="faq" className="zdb-section zdb-section-anchor" style={{ padding: '88px 40px', background: '#fff', scrollMarginTop: 72 }}>
      <div style={container(760)}>
        <p style={sectionTitle}>{COPY.faq.sectionTitle}</p>
        <h2 style={h2}>{COPY.faq.h2}</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 36 }}>
          {COPY.faq.items.map((item) => (
            <details key={item.q} className="zdb-faq-details" style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <summary className="zdb-faq-summary" style={{
                padding: '18px 20px', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: '#000',
                listStyle: 'none',
              }}>
                {item.q}
              </summary>
              <div style={{
                padding: '0 20px 18px', fontSize: 14, lineHeight: 1.65, color: '#000', fontWeight: 500,
                borderTop: `1px solid ${M.line}`,
              }}>
                {item.a}
                {'link' in item && item.link && (
                  <>
                    {' '}
                    <Link href={item.link.href} style={{ color: BRAND, textDecoration: 'none', fontWeight: 600 }}>
                      {item.link.label} →
                    </Link>
                  </>
                )}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
