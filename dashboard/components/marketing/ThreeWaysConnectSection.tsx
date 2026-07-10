'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { BRAND } from '@/components/brand'
import { M, container, h2, lead, sectionTitle } from './marketing-theme'
import { useLanding } from './LandingContext'

const GITHUB_URL = 'https://github.com/Zizka-ai/ZizkaDB'

const MCP_CONFIG = `{
  "mcpServers": {
    "zizkadb": {
      "command": "uvx",
      "args": ["zizkadb-mcp"],
      "env": { "ZIZKADB_API_KEY": "zizkadb_live_xxxx" }
    }
  }
}`

function CodeBlock({ children, lang }: { children: string; lang?: string }) {
  return (
    <pre style={{
      margin: '10px 0 0', padding: '12px 14px', borderRadius: 8,
      background: M.wash, border: `1px solid ${M.line}`,
      fontSize: 10, lineHeight: 1.55, overflowX: 'auto', color: '#000',
      fontFamily: 'ui-monospace, Menlo, monospace',
    }}>
      {lang && (
        <span style={{
          display: 'block', fontSize: 9, color: M.blue, marginBottom: 6,
          textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Inter, sans-serif', fontWeight: 800,
        }}>{lang}</span>
      )}
      {children}
    </pre>
  )
}

function ConnectStep({ n, title, children, accent }: { n: number; title: string; children: ReactNode; accent: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
        background: '#fff', border: `1.5px solid ${accent}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 800, color: accent,
      }}>{n}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#000', marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 11.5, color: '#334155', lineHeight: 1.5 }}>{children}</div>
      </div>
    </div>
  )
}

function SetupToggle({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginTop: 12 }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        fontSize: 12, fontWeight: 700, color: M.blue, background: 'none', border: 'none',
        cursor: 'pointer', padding: 0,
      }}>
        {open ? 'Hide setup' : 'Show setup →'}
      </button>
      {open && children}
    </div>
  )
}

function ConnectCard({
  id,
  title,
  accent,
  intro,
  highlighted,
  children,
}: {
  id: string
  title: string
  accent: string
  intro: string
  highlighted?: boolean
  children: ReactNode
}) {
  return (
    <div id={id} style={{
      background: '#fff',
      border: highlighted ? `2px solid ${accent}` : `1px solid ${M.line}`,
      borderRadius: 14,
      padding: '16px 16px 18px',
      boxShadow: highlighted ? `0 12px 36px ${accent}22` : 'none',
      transition: 'box-shadow 0.2s, border-color 0.2s',
    }}>
      <div style={{
        textAlign: 'center', margin: '0 0 14px', padding: '14px 16px', borderRadius: 10,
        background: `linear-gradient(135deg, ${accent} 0%, ${accent}dd 100%)`,
        boxShadow: `0 6px 20px ${accent}33`,
      }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: -0.4, lineHeight: 1.2 }}>
          {title}
          {highlighted && (
            <span style={{
              display: 'block', fontSize: 10, fontWeight: 700, marginTop: 4, opacity: 0.9,
            }}>Recommended for you</span>
          )}
        </div>
      </div>
      <p style={{ fontSize: 12, color: '#334155', margin: '0 0 2px', lineHeight: 1.5, textAlign: 'center' }}>
        {intro}
      </p>
      {children}
    </div>
  )
}

export function ThreeWaysConnectSection() {
  const { segment, track } = useLanding()
  const [copied, setCopied] = useState(false)

  function copyMcp() {
    navigator.clipboard.writeText(MCP_CONFIG)
    setCopied(true)
    track('mcp_copy', { source: 'connect_section' })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section id="how" className="zdb-section" style={{ padding: '64px 40px', background: '#fff' }}>
      <div style={container(960)}>
        <p style={sectionTitle}>How it works</p>
        <h2 style={{ ...h2, fontSize: 28, marginBottom: 8 }}>Three ways to deploy</h2>
        <p style={{ ...lead, fontSize: 15, marginBottom: 28, maxWidth: 520 }}>
          Managed cloud, MCP in your IDE, or self-hosted — same operational store, your choice of host.
        </p>

        <div className="zdb-connect-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, alignItems: 'start',
        }}>
          <ConnectCard
            id="managed"
            title="Managed cloud"
            accent={BRAND}
            intro="We run the stack at db.zizka.ai. Sign up, create an agent, copy your API key."
            highlighted={segment === 'managed'}
          >
            <ConnectStep n={1} title="Create account" accent={BRAND}>
              <Link href="/signup" style={{ color: BRAND, fontWeight: 700 }}>Sign up</Link> — email OTP, no card.
            </ConnectStep>
            <ConnectStep n={2} title="Create agent & key" accent={BRAND}>
              <Link href="/dashboard" style={{ color: BRAND, fontWeight: 700 }}>Dashboard</Link>
              {' '}→ create agent → copy key
            </ConnectStep>
            <SetupToggle>
              <CodeBlock lang="python">{`pip install zizkadb-sdk
from zizkadb import ZizkaDB
db = ZizkaDB("zizkadb_live_xxxx")
await db.log(agent="my-bot", event="started", data={})`}</CodeBlock>
            </SetupToggle>
          </ConnectCard>

          <ConnectCard
            id="mcp"
            title="MCP"
            accent={M.blue}
            intro="Plug into Cursor, Claude Desktop, or OpenAI MCP — no app refactor."
            highlighted={segment === 'solo'}
          >
            <ConnectStep n={1} title="Install" accent={M.blue}>
              <code style={{ fontFamily: 'monospace', fontSize: 10 }}>uvx zizkadb-mcp</code>
            </ConnectStep>
            <ConnectStep n={2} title="Paste & reload" accent={M.blue}>
              Add to <code style={{ fontFamily: 'monospace', fontSize: 10 }}>mcp.json</code> and reload MCP servers.
            </ConnectStep>
            <button type="button" onClick={copyMcp} style={{
              marginTop: 12, width: '100%', padding: '10px', borderRadius: 8, cursor: 'pointer',
              border: `1px solid ${M.line}`, background: M.bluePale, fontWeight: 700, fontSize: 12, color: M.blueDark,
            }}>
              {copied ? 'Copied!' : 'Copy MCP config'}
            </button>
            <SetupToggle>
              <CodeBlock lang="json">{MCP_CONFIG}</CodeBlock>
            </SetupToggle>
          </ConnectCard>

          <ConnectCard
            id="self-host"
            title="Self-hosted"
            accent={M.teal}
            intro="Run on your laptop or VPS — AGPL, free forever."
            highlighted={segment === 'solo'}
          >
            <ConnectStep n={1} title="Clone & start" accent={M.teal}>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" onClick={() => track('github_click', { source: 'connect' })}
                style={{ color: M.teal, fontWeight: 700 }}>GitHub</a>
              {' '}→ <code style={{ fontFamily: 'monospace', fontSize: 10 }}>bash scripts/setup-local.sh</code>
            </ConnectStep>
            <ConnectStep n={2} title="SDK" accent={M.teal}>
              Python or TypeScript — same API as managed cloud.
            </ConnectStep>
            <SetupToggle>
              <CodeBlock lang="bash">{`pip install zizkadb-sdk
from zizkadb import ZizkaDB
db = ZizkaDB(host="http://localhost:8000")`}</CodeBlock>
            </SetupToggle>
            <p style={{ fontSize: 11, margin: '12px 0 0', fontWeight: 700 }}>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={{ color: M.teal }}>GitHub →</a>
              {' · '}
              <Link href="/docs" style={{ color: '#000' }}>Docs</Link>
            </p>
          </ConnectCard>
        </div>
      </div>
    </section>
  )
}
