'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { BrandLogo } from '@/components/BrandLogo'
import { CalendlyBookModal } from '@/components/marketing/CalendlyBookModal'
import { BRAND } from '@/components/brand'
import {
  M,
  container,
  h2,
  lead,
  sectionTitle,
  primaryBtn,
  blueBtn,
  ghostBtn,
  outlineBtn,
} from '@/components/marketing/marketing-theme'

const GITHUB_URL = 'https://github.com/Zizka-ai/ZizkaDB'

const CAPABILITY_ROWS = [
  { cap: 'Event logging', api: 'POST /v1/events', oss: true, ent: true },
  { cap: 'Causal chain (why)', api: 'GET /v1/events/{id}/why', oss: true, ent: true },
  { cap: 'State at time T', api: 'GET /v1/events/at', oss: true, ent: true },
  { cap: 'Semantic search', api: 'POST /v1/search', oss: true, ent: true },
  { cap: 'Behavioral baseline', api: 'GET /v1/agents/{id}/baseline', oss: true, ent: true },
  { cap: 'GDPR erasure', api: 'DELETE /v1/memory/forget', oss: true, ent: true },
  { cap: 'Fleet dashboard', api: 'Enterprise UI', oss: false, ent: true },
  { cap: 'Fleet ranking', api: 'Enterprise UI', oss: false, ent: true },
  { cap: 'Audit export', api: 'CSV / JSON + checksums', oss: false, ent: true },
  { cap: 'Commercial license', api: 'Named org + expiry', oss: false, ent: true },
  { cap: 'Supported Week-1 install', api: 'Zizka + your team', oss: false, ent: true },
]

const WHY_ROWS = [
  { item: 'Deployment', detail: 'Your VPC, your region, your infrastructure' },
  { item: 'Data residency', detail: 'All agent data stays inside your private network' },
  { item: 'Behavioral drift', detail: 'Per-agent baseline with fleet-wide ranking' },
  { item: 'Audit trail', detail: 'On-demand export with per-event checksums' },
  { item: 'Commercial license', detail: 'Named org, defined expiry, no AGPL obligations' },
  { item: 'Integration support', detail: 'Week-1 install workshop with your dev team' },
  { item: 'Framework agnostic', detail: 'Python, TypeScript, MCP, REST. No framework lock-in.' },
  { item: 'Open core engine', detail: 'Same engine on GitHub, cloud, and Enterprise VPC' },
]

const SECURITY_ROWS = [
  { feature: 'Network isolation', detail: 'Agents reach ZizkaDB via same VPC, VPC peering, or PrivateLink' },
  { feature: 'TLS in transit', detail: 'All API and dashboard traffic over HTTPS' },
  { feature: 'Tenant isolation', detail: 'Single-tenant stack, no shared database with other customers' },
  { feature: 'GDPR erasure', detail: 'forget() deletes events by metadata filter on request' },
  { feature: 'Event checksums', detail: 'Per-event SHA-256 for audit integrity' },
  { feature: 'Access revocation', detail: 'Zizka access removed at handoff on Day 7' },
  { feature: 'Secrets management', detail: 'License key and API keys stored in your secrets manager' },
  { feature: 'Backup and restore', detail: 'Postgres dump scripts included in integration kit' },
]

const PRICING_TIERS = [
  {
    name: 'Starter VPC',
    period: '',
    highlight: false,
    features: [
      'Single-tenant VPC deployment',
      'Up to 5 agents',
      'Fleet dashboard',
      'Audit export',
      'Commercial license (1 year)',
      'Week-1 install included',
    ],
    cta: 'Lets connect',
    href: '#contact',
  },
  {
    name: 'Growth VPC',
    period: '',
    highlight: true,
    features: [
      'Single-tenant VPC deployment',
      'Up to 50 agents',
      'Fleet dashboard and ranking',
      'Audit export with checksums',
      'Commercial license (1 year)',
      'Week-1 install + integration workshop',
    ],
    cta: 'Lets connect',
    href: '#contact',
  },
  {
    name: 'Scale VPC',
    period: '',
    highlight: false,
    features: [
      'Single-tenant VPC deployment',
      'Unlimited agents',
      'Fleet dashboard and ranking',
      'Audit export with checksums',
      'Commercial license (1 year)',
      'Dedicated install sprint',
    ],
    cta: 'Lets connect',
    href: '#contact',
  },
]

const FAQ_ITEMS = [
  {
    q: 'Can you deploy inside our Kubernetes cluster?',
    a: 'Version 1 is a VM running Docker Compose. Helm is available when a deal requires it.',
  },
  {
    q: 'Do you modify our agent code?',
    a: 'An optional Launch Sprint can open pull requests on one or two services. The default path is your developers working with our integration kit.',
  },
  {
    q: 'How is this different from self-hosting from GitHub?',
    a: 'AGPL open core versus commercial license, fleet dashboard, audit export, and a supported Week-1 install in your VPC.',
  },
  {
    q: 'How is Enterprise different from Pro or Team cloud?',
    a: 'We host multi-tenant SaaS on db.zizka.ai. Enterprise is single-tenant in your VPC with a commercial license.',
  },
  {
    q: 'Can we run a POC without a VPC?',
    a: 'Cloud trial works for developer evaluation. Enterprise pilot is expected in your VPC.',
  },
  {
    q: 'How does GDPR and data residency work?',
    a: 'You control all data. forget() deletes by metadata filter. VPC deployments keep everything in your infrastructure.',
  },
]

export default function EnterprisePage() {
  const [demoOpen, setDemoOpen] = useState(false)
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', company: '', role: '', website: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: M.ink, background: '#fff' }}>
      <style>{`
        @media (max-width: 768px) {
          .ent-section { padding-left: 20px !important; padding-right: 20px !important; padding-top: 52px !important; padding-bottom: 52px !important; }
          .ent-price-grid { grid-template-columns: 1fr !important; }
          .ent-hero-btns { flex-direction: column !important; align-items: stretch !important; }
          .ent-hero-btns a, .ent-hero-btns button { justify-content: center !important; }
          .ent-footer { flex-direction: column !important; gap: 16px !important; align-items: flex-start !important; }
          .ent-footer-links { flex-wrap: wrap !important; gap: 16px !important; }
          .ent-split { grid-template-columns: 1fr !important; }
        }
        .ent-table { width: 100%; border-collapse: collapse; }
        .ent-table th, .ent-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
        .ent-table th { font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; background: #f9fafb; color: #374151; }
        .ent-table tr:last-child td { border-bottom: none; }
        .ent-table tr:hover td { background: #fafafa; }
        .faq-item { border-bottom: 1px solid #e5e7eb; }
        .faq-item:last-child { border-bottom: none; }
      `}</style>

      <SiteNav />

      {/* Hero */}
      <section className="ent-section" style={{
        padding: '72px 40px 60px',
        background: '#fff',
        borderBottom: `1px solid ${M.line}`,
      }}>
        <div style={{ ...container(760), textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            fontSize: 11, fontWeight: 800, letterSpacing: 1.2,
            textTransform: 'uppercase' as const,
            color: BRAND, marginBottom: 20,
            padding: '5px 14px', background: `${BRAND}12`, borderRadius: 6,
          }}>
            Enterprise
          </div>
          <h1 style={{
            fontSize: 44, fontWeight: 800, lineHeight: 1.12, margin: '0 0 32px',
            letterSpacing: -0.8, color: '#000',
          }}>
            Operational control for multi-agent fleets in your cloud
          </h1>

          <div className="ent-hero-btns" style={{
            display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center',
          }}>
            <a href="#contact" style={primaryBtn}>Lets connect</a>
            <button
              type="button"
              onClick={() => setDemoOpen(true)}
              style={{ ...outlineBtn, cursor: 'pointer' }}
            >
              Book demo
            </button>
          </div>

          <CalendlyBookModal open={demoOpen} onClose={() => setDemoOpen(false)} />
        </div>
      </section>

      {/* What ZizkaDB is */}
      <section className="ent-section" style={{ padding: '80px 40px', background: M.wash }}>
        <div style={container(860)}>
          <p style={sectionTitle}>What ZizkaDB is</p>
          <h2 style={h2}>Operational database for AI agents</h2>
          <p style={{ ...lead, marginBottom: 32 }}>
            ZizkaDB stores agent decisions, tool calls, and outcomes with causal links.
            It is not a vector index for RAG documents and not distributed traces.
            Most teams use all three alongside each other.
          </p>

          <div style={{ overflowX: 'auto' as const }}>
            <table className="ent-table" style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${M.line}` }}>
              <thead>
                <tr>
                  <th>Layer</th>
                  <th>Role</th>
                  <th>Examples</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Vector DB</td><td>RAG / knowledge retrieval</td><td>Pinecone, Qdrant</td></tr>
                <tr><td>App DB</td><td>Transactional app state</td><td>Postgres, Redis</td></tr>
                <tr><td style={{ fontWeight: 700, color: BRAND }}>Agent ops</td><td>Decision history, lineage, drift</td><td style={{ fontWeight: 700, color: BRAND }}>ZizkaDB</td></tr>
                <tr><td>Traces</td><td>Spans, framework hooks</td><td>LangSmith, OTel</td></tr>
              </tbody>
            </table>
          </div>

          <p style={{ marginTop: 20, fontSize: 14, color: '#555', fontWeight: 500 }}>
            Works with any LLM framework. No framework lock-in. Instrument with Python, TypeScript, MCP, or REST.
            Open core engine on GitHub (AGPL) runs the same code on self-host, managed cloud, and Enterprise VPC.
          </p>
        </div>
      </section>

      {/* Multi-agent fleets */}
      <section className="ent-section" style={{ padding: '80px 40px', background: '#fff' }}>
        <div style={container(960)}>
          <p style={sectionTitle}>Multi-agent fleets</p>
          <h2 style={h2}>One ZizkaDB instance. Many agents. Full visibility.</h2>
          <p style={{ ...lead, marginBottom: 40 }}>
            Each agent logs under a distinct name. Tenant-wide API keys support SaaS patterns
            with thousands of logical agents.
          </p>

          <div className="ent-split" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {[
              {
                icon: '🗺',
                title: 'Fleet observability',
                body: 'See all agents, last seen, and session volume in one place. Included in your Enterprise VPC deployment.',
              },
              {
                icon: '📈',
                title: 'Behavioral drift',
                body: 'Compare recent sessions to each agent\'s baseline. Verdicts from Stable to Significant. Operational behavior change, not hallucination detection.',
              },
              {
                icon: '🔗',
                title: 'Causal tracing',
                body: 'Walk decision chains with why() and replay sessions when something breaks in production.',
              },
            ].map((card) => (
              <div key={card.title} style={{
                padding: '28px 24px', borderRadius: 16, background: M.wash,
                border: `1px solid ${M.line}`,
              }}>
                <div style={{ fontSize: 28, marginBottom: 14 }}>{card.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 10px', color: '#000' }}>{card.title}</h3>
                <p style={{ fontSize: 14, color: '#333', lineHeight: 1.65, margin: 0, fontWeight: 500 }}>{card.body}</p>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 24, padding: '16px 20px', borderRadius: 10,
            background: '#fffbeb', border: '1px solid #fde68a', fontSize: 13, color: '#92400e', fontWeight: 500,
          }}>
            Drift means operational behavior change, for example tool errors up 12 percentage points.
            It is not hallucination detection or truth verification.
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="ent-section" style={{ padding: '80px 40px', background: M.wash }}>
        <div style={container(900)}>
          <p style={sectionTitle}>Capabilities</p>
          <h2 style={h2}>Open core today. Enterprise VPC adds fleet operations.</h2>
          <p style={{ ...lead, marginBottom: 36 }}>
            The same ZizkaDB engine runs on GitHub (AGPL), managed cloud, and Enterprise VPC.
            Enterprise adds commercial license, fleet UI, audit export, and supported Week-1 install.
          </p>

          <div style={{ overflowX: 'auto' as const }}>
            <table className="ent-table" style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${M.line}` }}>
              <thead>
                <tr>
                  <th>Capability</th>
                  <th>API / detail</th>
                  <th style={{ textAlign: 'center' as const }}>Open core</th>
                  <th style={{ textAlign: 'center' as const }}>Enterprise VPC</th>
                </tr>
              </thead>
              <tbody>
                {CAPABILITY_ROWS.map((row) => (
                  <tr key={row.cap}>
                    <td style={{ fontWeight: 600, color: '#000' }}>{row.cap}</td>
                    <td style={{ color: '#555', fontFamily: 'monospace', fontSize: 13 }}>{row.api}</td>
                    <td style={{ textAlign: 'center' as const, fontWeight: 700, color: row.oss ? '#16a34a' : '#d1d5db' }}>
                      {row.oss ? '✓' : '-'}
                    </td>
                    <td style={{ textAlign: 'center' as const, fontWeight: 700, color: '#16a34a' }}>✓</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Why enterprises choose */}
      <section className="ent-section" style={{ padding: '80px 40px', background: '#fff' }}>
        <div style={container(900)}>
          <p style={sectionTitle}>Why enterprises choose ZizkaDB</p>
          <h2 style={h2}>Private deployment. Operational control.</h2>
          <p style={{ ...lead, marginBottom: 36 }}>
            Built for teams that cannot send agent logs to a shared cloud and need
            a complete operational record for every agent decision.
          </p>

          <div style={{ overflowX: 'auto' as const }}>
            <table className="ent-table" style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${M.line}` }}>
              <thead>
                <tr>
                  <th>What you get</th>
                  <th>Why it matters</th>
                </tr>
              </thead>
              <tbody>
                {WHY_ROWS.map((row) => (
                  <tr key={row.item}>
                    <td style={{ fontWeight: 700, color: '#000', whiteSpace: 'nowrap' as const }}>{row.item}</td>
                    <td style={{ color: '#333' }}>{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Security and trust */}
      <section className="ent-section" style={{ padding: '80px 40px', background: M.wash }}>
        <div style={container(900)}>
          <p style={sectionTitle}>Security and trust</p>
          <h2 style={h2}>Built for production environments.</h2>
          <p style={{ ...lead, marginBottom: 36 }}>
            Single-tenant deployment with no shared infrastructure.
            Your data never leaves your network.
          </p>

          <div style={{ overflowX: 'auto' as const }}>
            <table className="ent-table" style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${M.line}` }}>
              <thead>
                <tr>
                  <th>Security feature</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {SECURITY_ROWS.map((row) => (
                  <tr key={row.feature}>
                    <td style={{ fontWeight: 700, color: '#000', whiteSpace: 'nowrap' as const }}>{row.feature}</td>
                    <td style={{ color: '#333' }}>{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{
            marginTop: 20, padding: '14px 18px', borderRadius: 10,
            background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 13, color: '#166534', fontWeight: 500,
          }}>
            SSO, SAML, and automated alerting are on the roadmap. Week-1 pilots use dashboard OTP plus VPN access.
          </div>
        </div>
      </section>

      {/* Deployment timeline */}
      <section className="ent-section" style={{ padding: '80px 40px', background: '#fff' }}>
        <div style={container(960)}>
          <p style={sectionTitle}>Deployment</p>
          <h2 style={h2}>Production-ready in your cloud within one week</h2>
          <p style={{ ...lead, marginBottom: 40 }}>
            Same install package every customer. Only variables: region, sizing, DNS, secrets, and license tier.
          </p>

          <div className="ent-split" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
            {[
              {
                icon: '🔌',
                title: 'No platform rewrite',
                body: 'Add ZIZKADB_HOST and ZIZKADB_API_KEY to your services. Instrument five log points per conversation.',
              },
              {
                icon: '🔄',
                title: 'Your CI/CD',
                body: 'You merge and redeploy through your pipeline. Optional Launch Sprint can help instrument one or two services via pull requests.',
              },
              {
                icon: '🔒',
                title: 'Private network',
                body: 'Agent subnets reach ZizkaDB via same VPC, VPC peering, or PrivateLink.',
              },
            ].map((card) => (
              <div key={card.title} style={{
                padding: '28px 24px', borderRadius: 16, background: M.wash,
                border: `1px solid ${M.line}`,
              }}>
                <div style={{ fontSize: 28, marginBottom: 14 }}>{card.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 10px', color: '#000' }}>{card.title}</h3>
                <p style={{ fontSize: 14, color: '#333', lineHeight: 1.65, margin: 0, fontWeight: 500 }}>{card.body}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { day: 'Day 0', label: 'Discovery and checklist' },
              { day: 'Day 1', label: 'Stack live in staging' },
              { day: 'Day 3', label: 'Integration workshop' },
              { day: 'Day 7', label: 'Handoff and access revoked' },
            ].map((step) => (
              <div key={step.day} style={{
                padding: '20px', borderRadius: 12, background: M.wash,
                border: `1px solid ${M.line}`, textAlign: 'center' as const,
              }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: BRAND, marginBottom: 6 }}>{step.day}</div>
                <div style={{ fontSize: 13, color: '#000', fontWeight: 600 }}>{step.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="ent-section" style={{ padding: '80px 40px', background: M.wash }}>
        <div style={container(960)}>
          <p style={sectionTitle}>Pricing</p>
          <h2 style={h2}>Annual VPC license. All tiers include the Week-1 install.</h2>
          <p style={{ ...lead, marginBottom: 40 }}>
            Contact us for exact pricing. All tiers are annual licenses with commercial rights included.
          </p>

          <div className="ent-price-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {PRICING_TIERS.map((tier) => (
              <div key={tier.name} style={{
                background: '#fff', borderRadius: 16, padding: '28px 24px',
                border: tier.highlight ? `2px solid ${BRAND}` : `1px solid ${M.line}`,
                position: 'relative',
                boxShadow: tier.highlight ? '0 12px 40px rgba(249,115,22,0.1)' : 'none',
              }}>
                {tier.highlight && (
                  <div style={{
                    position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
                    background: BRAND, color: '#fff', fontSize: 10, fontWeight: 700,
                    padding: '3px 12px', borderRadius: 100,
                  }}>
                    MOST COMMON
                  </div>
                )}
                <div style={{ fontSize: 13, fontWeight: 800, color: '#000', marginBottom: 8 }}>{tier.name}</div>
                <div style={{ fontSize: 12, color: '#555', marginBottom: 20, fontWeight: 500 }}>Annual license</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {tier.features.map((f) => (
                    <li key={f} style={{ fontSize: 13.5, color: '#000', display: 'flex', gap: 8, fontWeight: 500 }}>
                      <span style={{ color: '#16a34a', fontWeight: 800 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <a href={tier.href} style={{
                  display: 'block', textAlign: 'center' as const, padding: '11px', borderRadius: 10,
                  textDecoration: 'none', fontWeight: 600, fontSize: 14,
                  background: tier.highlight ? BRAND : '#fff',
                  color: tier.highlight ? '#fff' : '#000',
                  border: tier.highlight ? 'none' : `1px solid ${M.line}`,
                }}>
                  {tier.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="ent-section" style={{ padding: '80px 40px', background: '#fff' }}>
        <div style={container(760)}>
          <p style={sectionTitle}>FAQ</p>
          <h2 style={{ ...h2, marginBottom: 32 }}>Common enterprise questions</h2>

          <div style={{ border: `1px solid ${M.line}`, borderRadius: 12, overflow: 'hidden' }}>
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="faq-item">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: '100%', textAlign: 'left' as const, padding: '18px 20px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: 15, fontWeight: 600, color: '#000',
                  }}
                >
                  {item.q}
                  <span style={{ fontSize: 18, color: '#555', flexShrink: 0 }}>
                    {openFaq === i ? '-' : '+'}
                  </span>
                </button>
                {openFaq === i && (
                  <div style={{
                    padding: '0 20px 18px', fontSize: 14, color: '#444',
                    lineHeight: 1.7, fontWeight: 500,
                  }}>
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact form */}
      <section id="contact" className="ent-section" style={{ padding: '80px 40px', background: M.wash }}>
        <div style={container(600)}>
          <p style={sectionTitle}>Get started</p>
          <h2 style={h2}>Ready to deploy in your VPC?</h2>
          <p style={{ ...lead, marginBottom: 36 }}>
            Tell us about your agent fleet. We will map a Week-1 path or point you to managed cloud.
          </p>

          {submitted ? (
            <div style={{
              padding: '32px', borderRadius: 16, background: '#f0fdf4',
              border: '1px solid #bbf7d0', textAlign: 'center' as const,
            }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>✓</div>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#166534', margin: '0 0 8px' }}>
                Message received
              </p>
              <p style={{ fontSize: 14, color: '#166534', margin: 0, fontWeight: 500 }}>
                We will be in touch within one business day.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#000', display: 'block', marginBottom: 6 }}>
                    First name
                  </label>
                  <input
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 8,
                      border: `1px solid ${M.line}`, fontSize: 14, outline: 'none',
                      boxSizing: 'border-box' as const,
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#000', display: 'block', marginBottom: 6 }}>
                    Last name
                  </label>
                  <input
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 8,
                      border: `1px solid ${M.line}`, fontSize: 14, outline: 'none',
                      boxSizing: 'border-box' as const,
                    }}
                  />
                </div>
              </div>
              {[
                { label: 'Work email', key: 'email', type: 'email' },
                { label: 'Company', key: 'company', type: 'text' },
                { label: 'Role / title (optional)', key: 'role', type: 'text' },
                { label: 'Company website', key: 'website', type: 'url' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#000', display: 'block', marginBottom: 6 }}>
                    {label}
                  </label>
                  <input
                    type={type}
                    required={key !== 'role'}
                    value={(form as Record<string, string>)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 8,
                      border: `1px solid ${M.line}`, fontSize: 14, outline: 'none',
                      boxSizing: 'border-box' as const,
                    }}
                  />
                </div>
              ))}
              <button type="submit" style={{ ...primaryBtn, cursor: 'pointer', marginTop: 4 }}>
                Lets connect
              </button>
            </form>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'center', flexWrap: 'wrap' as const }}>
            <button
              type="button"
              onClick={() => setDemoOpen(true)}
              style={{ ...outlineBtn, cursor: 'pointer', fontSize: 14 }}
            >
              Book demo
            </button>
          </div>
        </div>
      </section>

      {/* Technical resources */}
      <section className="ent-section" style={{ padding: '72px 40px', background: '#fff', borderTop: `1px solid ${M.line}` }}>
        <div style={container(860)}>
          <p style={sectionTitle}>Technical resources</p>
          <h2 style={{ ...h2, marginBottom: 32 }}>For engineering and security review</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Overview', sub: 'What ZizkaDB is and how it fits', href: '/docs' },
              { label: 'Technical reference', sub: 'Architecture, APIs, data model', href: '/docs' },
              { label: 'Security', sub: 'TLS, tenant isolation, GDPR', href: '/trust' },
              { label: 'Integrity', sub: 'Checksums and retention', href: '/trust' },
              { label: 'Deployment modes', sub: 'Self-host, managed, Enterprise VPC', href: '/docs' },
              { label: 'Licensing', sub: 'AGPL vs commercial', href: '/docs' },
              { label: 'API reference', sub: 'REST explorer', href: '/api-explorer' },
              { label: 'Documentation', sub: 'SDK, MCP, integration guides', href: '/docs' },
              { label: 'Open source', sub: 'AGPL core on GitHub', href: GITHUB_URL },
            ].map((res) => (
              <a
                key={res.label}
                href={res.href}
                target={res.href.startsWith('http') ? '_blank' : undefined}
                rel={res.href.startsWith('http') ? 'noreferrer' : undefined}
                style={{
                  padding: '16px 18px', borderRadius: 10, background: M.wash,
                  border: `1px solid ${M.line}`, textDecoration: 'none',
                  display: 'block',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: '#000', marginBottom: 4 }}>{res.label}</div>
                <div style={{ fontSize: 12, color: '#555', fontWeight: 500 }}>{res.sub}</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="ent-footer" style={{
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
        <div className="ent-footer-links" style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
          {[['Docs', '/docs'], ['Pricing', '/#pricing'], ['Trust', '/trust'], ['GitHub', GITHUB_URL], ['Sign in', '/login']].map(([label, href]) =>
            href!.startsWith('http') ? (
              <a key={label} href={href} target="_blank" rel="noreferrer" style={{ color: '#000', textDecoration: 'none', fontWeight: 500 }}>{label}</a>
            ) : (
              <Link key={label} href={href!} style={{ color: '#000', textDecoration: 'none', fontWeight: 500 }}>{label}</Link>
            )
          )}
          <a href="#contact" style={{ color: '#000', fontWeight: 700, textDecoration: 'none' }}>Lets connect</a>
        </div>
      </footer>
    </div>
  )
}
