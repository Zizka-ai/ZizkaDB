'use client'

import Link from 'next/link'
import { useState } from 'react'
import { SiteNav } from '@/components/SiteNav'
import { IntegrationStrip } from '@/components/marketing/IntegrationStrip'
import { CalendlyBookModal } from '@/components/marketing/CalendlyBookModal'
import { CompetitorCompare } from '@/components/marketing/CompetitorCompare'
import { ConversationCompare } from '@/components/marketing/ConversationCompare'
import { TrustBar } from '@/components/marketing/TrustBar'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'
import { MarketingPageStyles } from '@/components/marketing/MarketingPageStyles'
import { PricingCard } from '@/components/marketing/PricingCard'
import { LANDING_PRICING_PLANS } from '@/components/marketing/pricing-plans'
import { BRAND } from '@/components/brand'
import { M, container, h2, lead, sectionTitle, primaryBtn, blueBtn, violetBtn, ghostBtn, outlineBtn } from '@/components/marketing/marketing-theme'

const GITHUB_URL = 'https://github.com/Zizka-ai/ZizkaDB'

const HERO_TITLE = 'Operational Database For AI Agents'
const HERO_VALUE = 'Make your agents auditable, reliable, and more deterministic.'
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

const WHY_BOXES = [
  {
    label: 'How Your Agent Fails',
    accent: '#ef4444',
    items: [
      'LLM probability leads to inconsistent decisions',
      'Behavioral drift changes agent execution over time',
      'Tool calls and workflows become unpredictable',
      'Small prompt changes produce unexpected outputs',
    ],
  },
  {
    label: 'Business Impact',
    accent: '#f97316',
    items: [
      'Incorrect responses reach end users',
      'Execution failures damage customer trust',
      'Increased token and infrastructure costs',
      'Longer debugging time slows development',
    ],
  },
  {
    label: 'With ZizkaDB',
    accent: '#16a34a',
    items: [
      'Audit and replay every agent execution',
      'Measure behavioral drift across defined windows',
      'Search semantic memory with complete timelines',
      'Trace root causes using decision lineage',
    ],
  },
]

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
      <MarketingPageStyles />

      <SiteNav />

      {/* Hero */}
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

      {/* Why ZizkaDB */}
      <section className="zdb-section" style={{ padding: '80px 40px', background: M.wash }}>
        <div style={container(1000)}>
          <p style={sectionTitle}>Why ZizkaDB</p>
          <h2 style={h2}>Your agents need more than logs.</h2>
          <p style={{ ...lead, marginBottom: 40 }}>
            ZizkaDB monitors, audits, and provides you the operational data. You correct your agent.
          </p>

          <div
            className="zdb-why-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}
          >
            {WHY_BOXES.map((box) => (
              <div
                key={box.label}
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  padding: '28px 24px',
                  border: `1px solid ${M.line}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0,
                }}
              >
                <div style={{
                  display: 'inline-block',
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase' as const,
                  color: box.accent,
                  marginBottom: 16,
                  padding: '4px 10px',
                  background: `${box.accent}12`,
                  borderRadius: 6,
                  alignSelf: 'flex-start',
                }}>
                  {box.label}
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {box.items.map((item) => (
                    <li key={item} style={{ display: 'flex', gap: 10, fontSize: 14, color: '#000', fontWeight: 500, lineHeight: 1.55 }}>
                      <span style={{ color: box.accent, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>
                        {box.accent === '#16a34a' ? '✓' : '·'}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ConversationCompare />

      {/* Ship and debug */}
      <section className="zdb-section" style={{ padding: '88px 40px', background: '#fff' }}>
        <div style={container(960)}>
          <p style={sectionTitle}>For teams building with agents</p>
          <h2 style={h2}>Ship agents faster. Debug them in production.</h2>
          <p style={lead}>Whether you are building a single agent or a multi-agent system, ZizkaDB fits how dev teams work.</p>

          <div className="zdb-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
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

            <div style={{
              padding: '32px 28px', borderRadius: 20, background: '#fff',
              border: `1px solid ${BRAND}33`, boxShadow: '0 8px 32px rgba(249,115,22,0.07)',
            }}>
              <div style={{ fontSize: 28, marginBottom: 16 }}>🏢</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px', color: '#000' }}>
                Host on your private cloud
              </h3>
              <p style={{ fontSize: 15, color: '#000', lineHeight: 1.65, margin: '0 0 20px', fontWeight: 500 }}>
                Deploy the complete ZizkaDB stack in your own cloud. Understand your multi-agent fleet with
                real-time operational insights so your team can correct failures before they reach users.
              </p>
              <Link href="/enterprise" style={{ ...outlineBtn, fontSize: 14, padding: '12px 22px', textDecoration: 'none' }}>
                Explore Enterprise
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="zdb-section" style={{ padding: '72px 40px', background: M.wash }}>
        <div style={container(960)}>
          <p style={sectionTitle}>Trust and security</p>
          <h2 style={{ ...h2, marginBottom: 36 }}>Production-ready from day one</h2>
          <TrustBar />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="zdb-section" style={{ padding: '88px 40px', background: '#fff' }}>
        <div style={container(1120)}>
          <p style={sectionTitle}>Pricing</p>
          <h2 style={h2}>Start free. Scale when you need to.</h2>
          <p style={lead}>Full monitoring and session replay on every plan.</p>

          <div className="zdb-price-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {LANDING_PRICING_PLANS.map(plan => (
              <PricingCard key={plan.name} plan={plan} />
            ))}
          </div>
        </div>
      </section>

      <CompetitorCompare />

      {/* Final CTA */}
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
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={ghostBtn}>GitHub</a>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
