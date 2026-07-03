'use client'

import Link from 'next/link'
import { useState } from 'react'
import { SiteNav } from '@/components/SiteNav'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'
import {
  OverviewSection,
  PythonSection,
  TypeScriptSection,
  RestSection,
  McpSection,
  SelfHostSection,
  ConceptsSection,
  FrameworksSection,
} from './sections'

const API_EXPLORER_URL = '/swagger'

type Section =
  | 'overview'
  | 'frameworks'
  | 'python'
  | 'typescript'
  | 'rest'
  | 'mcp'
  | 'selfhost'
  | 'concepts'

const NAV: { id: Section; label: string; group: 'start' | 'integrate' | 'ref' }[] = [
  { id: 'overview',   label: 'Overview',       group: 'start' },
  { id: 'frameworks', label: 'Frameworks',     group: 'integrate' },
  { id: 'python',     label: 'Python SDK',     group: 'integrate' },
  { id: 'typescript', label: 'TypeScript SDK', group: 'integrate' },
  { id: 'rest',       label: 'REST API',       group: 'integrate' },
  { id: 'mcp',        label: 'MCP',            group: 'integrate' },
  { id: 'selfhost',   label: 'Self-host',      group: 'integrate' },
  { id: 'concepts',   label: 'Core concepts',  group: 'ref' },
]

const MOBILE_LABELS: Record<Section, string> = {
  overview: 'Overview',
  frameworks: 'Frameworks',
  python: 'Python',
  typescript: 'TypeScript',
  rest: 'REST',
  mcp: 'MCP',
  selfhost: 'Self-host',
  concepts: 'Concepts',
}

const S = {
  page:   { fontFamily: 'Inter, system-ui, sans-serif', color: '#111', background: '#fff', minHeight: '100vh' } as const,
  layout: { display: 'flex', maxWidth: 1100, margin: '0 auto' } as const,
  main:   { flex: 1, padding: '32px 20px 80px', maxWidth: 820, minWidth: 0 } as const,
  label:  { fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: 1, textTransform: 'uppercase' as const, margin: '0 0 6px' },
}

function NavItem({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: 'block', width: '100%', textAlign: 'left', background: active ? '#f5f5f5' : 'none',
      border: 'none', borderRadius: 7, padding: '7px 12px', fontSize: 13.5,
      color: active ? '#111' : '#555', fontWeight: active ? 600 : 400, cursor: 'pointer', marginBottom: 2,
    }}>
      {children}
    </button>
  )
}

export default function DocsPage() {
  const [section, setSection] = useState<Section>('overview')

  const navigate = (id: string) => {
    const valid: Section[] = ['overview', 'frameworks', 'python', 'typescript', 'rest', 'mcp', 'selfhost', 'concepts']
    if (valid.includes(id as Section)) setSection(id as Section)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div style={S.page}>
      <style>{`
        @media (max-width: 640px) {
          .docs-sidebar { display: none !important; }
          .docs-mobile-nav { display: flex !important; }
          .docs-main { padding: 20px 16px 60px !important; }
        }
      `}</style>

      <SiteNav active="docs" suffix="Docs" />

      <div className="docs-mobile-nav" style={{
        display: 'none', overflowX: 'auto', borderBottom: '1px solid #f0f0f0',
        padding: '0 16px', gap: 0, position: 'sticky', top: 56, background: '#fff', zIndex: 99,
      }}>
        {NAV.map(({ id, label }) => (
          <button key={id} type="button" onClick={() => navigate(id)} style={{
            padding: '10px 14px', fontSize: 13, fontWeight: 500, border: 'none', background: 'none',
            cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            borderBottom: section === id ? '2px solid #111' : '2px solid transparent',
            color: section === id ? '#111' : '#888',
          }}>{MOBILE_LABELS[id]}</button>
        ))}
      </div>

      <div style={S.layout}>
        <aside className="docs-sidebar" style={{ width: 210, flexShrink: 0, padding: '32px 16px', position: 'sticky', top: 56, height: 'calc(100vh - 56px)', overflowY: 'auto', borderRight: '1px solid #f0f0f0' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={S.label}>Start here</div>
            {NAV.filter(n => n.group === 'start').map(n => (
              <NavItem key={n.id} active={section === n.id} onClick={() => navigate(n.id)}>{n.label}</NavItem>
            ))}
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={S.label}>Integrations</div>
            {NAV.filter(n => n.group === 'integrate').map(n => (
              <NavItem key={n.id} active={section === n.id} onClick={() => navigate(n.id)}>{n.label}</NavItem>
            ))}
          </div>
          <div>
            <div style={S.label}>Reference</div>
            {NAV.filter(n => n.group === 'ref').map(n => (
              <NavItem key={n.id} active={section === n.id} onClick={() => navigate(n.id)}>{n.label}</NavItem>
            ))}
            <a href={API_EXPLORER_URL} style={{ display: 'block', fontSize: 13.5, color: '#666', textDecoration: 'none', padding: '7px 12px', marginBottom: 2 }}>
              API Explorer ↗
            </a>
            <Link href="/trust" style={{ display: 'block', fontSize: 13.5, color: '#666', textDecoration: 'none', padding: '7px 12px' }}>
              Technical reference
            </Link>
          </div>
        </aside>

        <main className="docs-main" style={S.main}>
          {section === 'overview' && <OverviewSection onNavigate={navigate} />}
          {section === 'frameworks' && <FrameworksSection />}
          {section === 'python' && <PythonSection />}
          {section === 'typescript' && <TypeScriptSection />}
          {section === 'rest' && <RestSection />}
          {section === 'mcp' && <McpSection />}
          {section === 'selfhost' && <SelfHostSection />}
          {section === 'concepts' && <ConceptsSection onNavigate={navigate} />}
        </main>
      </div>
      <MarketingFooter />
    </div>
  )
}
