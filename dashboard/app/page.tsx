'use client'

import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { CalendlyBookModal } from '@/components/marketing/CalendlyBookModal'
import { CompetitorCompare } from '@/components/marketing/CompetitorCompare'
import { EnterpriseSection } from '@/components/marketing/EnterpriseSection'
import { LandingHero } from '@/components/marketing/LandingHero'
import { LandingProvider, useLanding } from '@/components/marketing/LandingContext'
import { LogsVsOperationalSection } from '@/components/marketing/LogsVsOperationalSection'
import { ManagedCloudSection } from '@/components/marketing/ManagedCloudSection'
import { MarketingPopup } from '@/components/marketing/MarketingPopup'
import { OperationalMeansSection } from '@/components/marketing/OperationalMeansSection'
import { StickyCtaBar } from '@/components/marketing/StickyCtaBar'
import { ThreeWaysConnectSection } from '@/components/marketing/ThreeWaysConnectSection'
import { TrustBar } from '@/components/marketing/TrustBar'
import { BrandLogo } from '@/components/BrandLogo'
import { BRAND, BRAND_DARK } from '@/components/brand'
import { M, container, h2, lead, sectionTitle, primaryBtn, ghostBtn } from '@/components/marketing/marketing-theme'

const GITHUB_URL = 'https://github.com/Zizka-ai/ZizkaDB'
const FINAL_CTA_LINE = 'Operational database for AI agents — start free or self-host today.'

function LandingModals() {
  const { demoOpen, setDemoOpen } = useLanding()
  return <CalendlyBookModal open={demoOpen} onClose={() => setDemoOpen(false)} />
}

function LandingPageInner() {
  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: M.ink, background: '#fff' }}>
      <style>{`
        @keyframes zdbFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .zdb-reveal { animation: zdbFadeUp 0.55s ease forwards; }
        @media (max-width: 1024px) {
          .zdb-connect-grid { grid-template-columns: 1fr !important; }
          .zdb-operational-grid { grid-template-columns: 1fr !important; }
          .zdb-managed-benefits { grid-template-columns: 1fr !important; }
          .zdb-enterprise-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          .zdb-section { padding-left: 20px !important; padding-right: 20px !important; }
          .zdb-hero-section { padding: 40px 20px 48px !important; }
          .zdb-hero-title { font-size: 32px !important; }
          .zdb-hero-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .zdb-hero-demo { order: -1; }
          .zdb-connect-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
          .zdb-section { padding-top: 48px !important; padding-bottom: 48px !important; }
          .zdb-price-grid { grid-template-columns: 1fr !important; }
          .zdb-trust-grid { grid-template-columns: 1fr 1fr !important; }
          .zdb-hero-btns { flex-direction: column !important; align-items: stretch !important; }
          .zdb-hero-btns a, .zdb-hero-btns button { justify-content: center !important; }
          .zdb-footer { flex-direction: column !important; gap: 16px !important; align-items: flex-start !important; }
          .zdb-footer-links { flex-wrap: wrap !important; gap: 16px !important; }
          .site-nav-links { display: none !important; }
        }
      `}</style>

      <SiteNav />
      <LandingHero />

      <div className="zdb-reveal">
        <OperationalMeansSection />
      </div>

      <LogsVsOperationalSection />
      <ManagedCloudSection />
      <ThreeWaysConnectSection />
      <EnterpriseSection />

      <section className="zdb-section" style={{ padding: '72px 40px', background: '#fff' }}>
        <div style={container(960)}>
          <p style={sectionTitle}>Trust & security</p>
          <h2 style={{ ...h2, marginBottom: 36 }}>Production-ready from day one</h2>
          <TrustBar />
        </div>
      </section>

      <section id="pricing" className="zdb-section" style={{ padding: '80px 40px', background: M.wash }}>
        <div style={container(900)}>
          <p style={sectionTitle}>Pricing</p>
          <h2 style={h2}>Start free. Scale when you need to.</h2>
          <p style={lead}>Full monitoring and session replay on every plan.</p>

          <div className="zdb-price-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {([
              {
                name: 'Self-Hosted', price: 'Free', sub: 'forever',
                features: ['Full feature set', 'Your infrastructure', 'Docker Compose', 'Community support'],
                cta: 'Setup guide', href: '/docs', highlight: false,
              },
              {
                name: 'Pro', price: '€39', sub: '/ month',
                features: ['100M events', '90-day retention', '3 projects', 'Email support'],
                cta: 'Start free trial', href: '/signup', highlight: true,
                note: 'No credit card needed',
              },
              {
                name: 'Team', price: '€99', sub: '/ month',
                features: ['Up to 1B events/mo', '1-year retention', '10 seats', 'Priority support'],
                cta: 'Start free trial', href: '/signup', highlight: false,
                note: 'No credit card needed',
              },
            ] as const).map(plan => (
              <div key={plan.name} style={{
                background: '#fff', borderRadius: 16, padding: '28px 24px',
                border: plan.highlight ? `2px solid ${BRAND}` : `1px solid ${M.line}`,
                position: 'relative',
                boxShadow: plan.highlight ? '0 12px 40px rgba(249,115,22,0.1)' : 'none',
              }}>
                {plan.highlight && (
                  <div style={{
                    position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
                    background: BRAND, color: '#fff', fontSize: 10, fontWeight: 700,
                    padding: '3px 12px', borderRadius: 100,
                  }}>
                    POPULAR
                  </div>
                )}
                <div style={{ fontSize: 12, fontWeight: 800, color: '#000', marginBottom: 8 }}>{plan.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 16 }}>
                  <span style={{ fontSize: 32, fontWeight: 700, color: '#000' }}>{plan.price}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#000' }}>{plan.sub}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ fontSize: 13.5, color: '#000', display: 'flex', gap: 8, fontWeight: 500 }}>
                      <span style={{ color: BRAND, fontWeight: 800 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.href} style={{
                  display: 'block', textAlign: 'center', padding: '11px', borderRadius: 10,
                  textDecoration: 'none', fontWeight: 600, fontSize: 14,
                  background: plan.highlight ? BRAND : '#fff',
                  color: plan.highlight ? '#fff' : '#000',
                  border: plan.highlight ? 'none' : `1px solid ${M.line}`,
                }}>
                  {plan.cta}
                </Link>
                {'note' in plan && plan.note && (
                  <p style={{ textAlign: 'center', fontSize: 11, color: '#64748b', marginTop: 8, marginBottom: 0, fontWeight: 600 }}>{plan.note}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <CompetitorCompare />

      <section className="zdb-section" style={{
        padding: '88px 40px', background: M.heroBg, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: M.heroGlowOrange, pointerEvents: 'none' }} />
        <div style={{ ...container(640), textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: 34, fontWeight: 800, color: '#fff', margin: '0 0 14px', letterSpacing: -0.6, lineHeight: 1.15 }}>
            {FINAL_CTA_LINE}
          </h2>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.7)', margin: '0 0 28px', lineHeight: 1.65 }}>
            Fix before production breaks.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={primaryBtn}>Start free trial</Link>
            <Link href="/docs" style={ghostBtn}>Read the docs</Link>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={ghostBtn}>GitHub →</a>
          </div>
        </div>
      </section>

      <footer className="zdb-footer" style={{
        borderTop: `1px solid ${M.line}`, padding: '32px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 13, color: '#000', background: '#fff', flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BrandLogo variant="mark" showWordmark={false} href="/" />
          <span style={{ fontWeight: 700, color: '#000' }}>ZizkaDB</span>
          <span style={{ color: '#64748b' }}>·</span>
          <span style={{ fontWeight: 500, color: '#64748b' }}>ZIZKA AI S.L. · Operational database for AI agents</span>
        </div>
        <div className="zdb-footer-links" style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
          {[['Docs', '/docs'], ['Pricing', '#pricing'], ['Enterprise', '#enterprise'], ['Trust', '/trust'], ['GitHub', GITHUB_URL], ['Sign in', '/login']].map(([label, href]) =>
            href.startsWith('http') ? (
              <a key={label} href={href} target="_blank" rel="noreferrer" style={{ color: '#000', textDecoration: 'none', fontWeight: 500 }}>{label}</a>
            ) : (
              <Link key={label} href={href} style={{ color: '#000', textDecoration: 'none', fontWeight: 500 }}>{label}</Link>
            )
          )}
          <Link href="/signup" style={{ color: BRAND_DARK, fontWeight: 700, textDecoration: 'none' }}>Start free</Link>
        </div>
      </footer>

      <MarketingPopup />
      <StickyCtaBar />
      <LandingModals />
    </div>
  )
}

export default function LandingPage() {
  return (
    <LandingProvider>
      <LandingPageInner />
    </LandingProvider>
  )
}
