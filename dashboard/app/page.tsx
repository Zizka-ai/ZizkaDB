'use client'

import Link from 'next/link'
import { useState } from 'react'
import { SiteNav } from '@/components/SiteNav'
import { IntegrationStrip } from '@/components/marketing/IntegrationStrip'
import { CalendlyBookModal } from '@/components/marketing/CalendlyBookModal'
import { CompetitorCompare } from '@/components/marketing/CompetitorCompare'
import { ConversationCompare } from '@/components/marketing/ConversationCompare'
import { ThreeWaysConnectSection } from '@/components/marketing/ThreeWaysConnectSection'
import { TrustBar } from '@/components/marketing/TrustBar'
import { BrandLogo } from '@/components/BrandLogo'
import { BRAND, BRAND_DARK } from '@/components/brand'
import { M, container, h2, lead, sectionTitle, primaryBtn, blueBtn, violetBtn, ghostBtn, outlineBtn } from '@/components/marketing/marketing-theme'

const GITHUB_URL = 'https://github.com/Zizka-ai/ZizkaDB'

const HERO_TITLE = 'Operational Database For AI Agents'
const HERO_VALUE = 'Fix failures in minutes, not after customer complaints.'
const FINAL_CTA_LINE = 'Fix before production breaks'

const MCP_CONFIG = `{
  "mcpServers": {
    "zizkadb": {
      "command": "uvx",
      "args": ["zizkadb-mcp"],
      "env": { "ZIZKADB_API_KEY": "zizkadb_live_xxxx" }
    }
  }
}`

export default function LandingPage() {
  const [copied, setCopied] = useState<string | null>(null)
  const [demoOpen, setDemoOpen] = useState(false)

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: M.ink, background: '#fff' }}>
      <style>{`
        @media (max-width: 1024px) {
          .zdb-connect-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          .zdb-section { padding-left: 20px !important; padding-right: 20px !important; }
          .zdb-hero-title { font-size: 32px !important; }
          .zdb-hero-value { font-size: 16px !important; }
          .zdb-connect-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
          .zdb-section { padding-top: 48px !important; padding-bottom: 48px !important; }
          .zdb-compare-grid { grid-template-columns: 1fr !important; }
          .zdb-split { grid-template-columns: 1fr !important; }
          .zdb-price-grid { grid-template-columns: 1fr !important; }
          .zdb-trust-grid { grid-template-columns: 1fr 1fr !important; }
          .zdb-hero-btns { flex-direction: column !important; align-items: stretch !important; }
          .zdb-hero-btns a, .zdb-hero-btns button { justify-content: center !important; }
          .zdb-footer { flex-direction: column !important; gap: 16px !important; align-items: flex-start !important; }
          .zdb-footer-links { flex-wrap: wrap !important; gap: 16px !important; }
        }
      `}</style>

      <SiteNav />

      {/* ── Hero ── */}
      <section className="zdb-section" style={{
        padding: '72px 40px 56px',
        background: '#fff',
        borderBottom: `1px solid ${M.line}`,
      }}>
        <div style={{ ...container(760), textAlign: 'center' }}>
          <h1 className="zdb-hero-title" style={{
            fontSize: 48, fontWeight: 800, lineHeight: 1.12, margin: '0 0 36px',
            letterSpacing: -0.9, color: '#000',
          }}>
            {HERO_TITLE}
          </h1>

          <div className="zdb-hero-btns" style={{
            display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 28,
          }}>
            <Link href="/signup" style={primaryBtn}>Free Trial</Link>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={blueBtn}>Self host</a>
            <button type="button" onClick={() => setDemoOpen(true)} style={{ ...violetBtn, cursor: 'pointer' }}>
              Book demo
            </button>
          </div>

          <CalendlyBookModal open={demoOpen} onClose={() => setDemoOpen(false)} />

          <p className="zdb-hero-value" style={{
            fontSize: 18, fontWeight: 600, color: '#000', margin: 0, lineHeight: 1.55, maxWidth: 520, marginInline: 'auto',
          }}>
            {HERO_VALUE}
          </p>

          <div style={{ marginTop: 48 }}>
            <IntegrationStrip />
          </div>
        </div>
      </section>

      <ThreeWaysConnectSection />

      <ConversationCompare />

      {/* ── Engineering teams ── */}
      <section className="zdb-section" style={{ padding: '88px 40px', background: M.wash }}>
        <div style={container(960)}>
          <p style={sectionTitle}>For engineering teams</p>
          <h2 style={h2}>Ship agents faster. Debug them in production.</h2>
          <p style={lead}>Whether you are building a single agent or a multi-agent system, ZizkaDB fits how dev teams work.</p>

          <div className="zdb-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{
              padding: '32px 28px', borderRadius: 20, background: '#fff',
              border: `1px solid ${M.blue}33`, boxShadow: '0 8px 32px rgba(37,99,235,0.08)',
            }}>
              <div style={{ fontSize: 28, marginBottom: 16 }}>⚙️</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px', color: '#000' }}>
                Integrate in an afternoon
              </h3>
              <p style={{ fontSize: 15, color: '#000', lineHeight: 1.65, margin: '0 0 20px', fontWeight: 500 }}>
                Log from Python, TypeScript, MCP, or REST. Self-host with Docker or use managed cloud.
                One API key per agent. No heavy infra project.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link href="/docs" style={{ ...blueBtn, fontSize: 14, padding: '12px 20px', textDecoration: 'none' }}>
                  5-minute setup
                </Link>
                <button
                  type="button"
                  onClick={() => copy(MCP_CONFIG, 'mcp')}
                  style={{ ...outlineBtn, cursor: 'pointer' }}
                >
                  {copied === 'mcp' ? 'Copied MCP config' : 'Copy MCP config'}
                </button>
              </div>
            </div>

            <div style={{
              padding: '32px 28px', borderRadius: 20, background: '#fff',
              border: `1px solid ${M.line}`, boxShadow: '0 8px 32px rgba(15,23,42,0.05)',
            }}>
              <div style={{ fontSize: 28, marginBottom: 16 }}>🔍</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px', color: '#000' }}>
                Debug production incidents
              </h3>
              <p style={{ fontSize: 15, color: '#000', lineHeight: 1.65, margin: '0 0 20px', fontWeight: 500 }}>
                Prompt change broke behavior? Tool call ignored? Replay the full session, trace the decision chain,
                and find root cause without digging through logs.
              </p>
              <Link href="/signup" style={{ ...primaryBtn, fontSize: 14, padding: '12px 22px' }}>
                Start free trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust ── */}
      <section className="zdb-section" style={{ padding: '72px 40px', background: '#fff' }}>
        <div style={container(960)}>
          <p style={sectionTitle}>Trust & security</p>
          <h2 style={{ ...h2, marginBottom: 36 }}>Production-ready from day one</h2>
          <TrustBar />
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="zdb-section" style={{ padding: '88px 40px', background: M.wash }}>
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
                cta: 'Start free trial', href: '/signup?plan=pro', highlight: true,
                note: '30-day free trial · No credit card required',
              },
              {
                name: 'Team', price: '€99', sub: '/ month',
                features: ['Up to 1B events/mo', '1-year retention', '10 seats', 'Priority support'],
                cta: 'Start free trial', href: '/signup?plan=team', highlight: false,
                note: '30-day free trial · No credit card required',
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
                      <span style={{ color: '#000', fontWeight: 800 }}>✓</span> {f}
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
                  <p style={{ textAlign: 'center', fontSize: 11, color: '#000', marginTop: 8, marginBottom: 0, fontWeight: 600 }}>{plan.note}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <CompetitorCompare />

      {/* ── Final CTA ── */}
      <section className="zdb-section" style={{
        padding: '88px 40px', background: M.heroBg, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: M.heroGlowBlue, pointerEvents: 'none' }} />
        <div style={{ ...container(600), textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: 36, fontWeight: 700, color: '#fff', margin: '0 0 14px', letterSpacing: -0.6, lineHeight: 1.15 }}>
            {FINAL_CTA_LINE}
          </h2>
          <p style={{ fontSize: 17, color: '#fff', margin: '0 0 28px', lineHeight: 1.65, fontWeight: 600 }}>
            Start free on db.zizka.ai. Self-host anytime.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={primaryBtn}>Start free trial</Link>
            <Link href="/docs" style={ghostBtn}>Read the docs</Link>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={ghostBtn}>GitHub →</a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="zdb-footer" style={{
        borderTop: `1px solid ${M.line}`, padding: '32px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 13, color: '#000', background: '#fff', flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BrandLogo variant="mark" showWordmark={false} href="/" />
          <span style={{ fontWeight: 700, color: '#000' }}>ZizkaDB</span>
          <span style={{ color: '#000' }}>·</span>
          <span style={{ fontWeight: 500, color: '#000' }}>Open source operational database for AI agents</span>
        </div>
        <div className="zdb-footer-links" style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
          {[['Docs', '/docs'], ['Pricing', '#pricing'], ['Trust', '/trust'], ['GitHub', GITHUB_URL], ['Sign in', '/login']].map(([label, href]) =>
            href.startsWith('http') ? (
              <a key={label} href={href} target="_blank" rel="noreferrer" style={{ color: '#000', textDecoration: 'none', fontWeight: 500 }}>{label}</a>
            ) : (
              <Link key={label} href={href} style={{ color: '#000', textDecoration: 'none', fontWeight: 500 }}>{label}</Link>
            )
          )}
          <Link href="/signup" style={{ color: '#000', fontWeight: 700, textDecoration: 'none' }}>Start free</Link>
        </div>
      </footer>
    </div>
  )
}
