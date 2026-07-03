import Link from 'next/link'
import { COPY } from './enterprise-copy'
import { EnterpriseConnectForm } from './EnterpriseConnectForm'
import { M, container, ghostBtn, violetBtn } from '../marketing-theme'

type Props = {
  onBookDemo: () => void
}

export function EnterpriseFooterCtaSection({ onBookDemo }: Props) {
  return (
    <section
      id="connect"
      className="zdb-section"
      style={{
        padding: '88px 40px',
        background: M.heroBg,
        position: 'relative',
        overflow: 'hidden',
        scrollMarginTop: 72,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: M.heroGlowBlue, pointerEvents: 'none' }} />
      <div style={{ ...container(640), position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <h2 style={{ fontSize: 32, fontWeight: 700, color: '#fff', margin: '0 0 12px', letterSpacing: -0.5 }}>
          {COPY.footerCta.h2}
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.88)', margin: '0 0 28px', lineHeight: 1.65, fontWeight: 500 }}>
          {COPY.footerCta.subhead}
        </p>

        <EnterpriseConnectForm />

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 24 }}>
          <button type="button" onClick={onBookDemo} style={{ ...violetBtn, cursor: 'pointer', border: 'none' }}>
            {COPY.footerCta.demoCta}
          </button>
          <Link href="/signup" style={ghostBtn}>{COPY.footerCta.cloudCta}</Link>
        </div>
      </div>
    </section>
  )
}
