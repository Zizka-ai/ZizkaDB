import Link from 'next/link'
import type { ReactNode } from 'react'
import { M, container, h2, lead, sectionTitle } from './marketing-theme'
import { GITHUB_URL } from '@/lib/constants'

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
      margin: '10px 0 0',
      padding: '10px 12px',
      borderRadius: 8,
      background: M.wash,
      border: `1px solid ${M.line}`,
      fontSize: 10,
      lineHeight: 1.55,
      overflowX: 'auto',
      overflowY: 'auto',
      maxHeight: 112,
      color: '#000',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
    }}>
      {lang && (
        <span style={{
          display: 'block', fontSize: 9, color: M.blue, marginBottom: 6,
          textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Inter, sans-serif', fontWeight: 800,
        }}>
          {lang}
        </span>
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
        <div style={{ fontSize: 11.5, color: '#000', lineHeight: 1.5, fontWeight: 500 }}>{children}</div>
      </div>
    </div>
  )
}

function ConnectCard({
  title,
  accent,
  intro,
  children,
}: {
  title: string
  accent: string
  intro: string
  children: ReactNode
}) {
  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${M.line}`,
      borderRadius: 14,
      padding: '16px 16px 18px',
      overflow: 'hidden',
    }}>
      <div style={{
        textAlign: 'center',
        margin: '0 0 14px',
        padding: '14px 16px',
        borderRadius: 10,
        background: `linear-gradient(135deg, ${accent} 0%, ${accent}dd 100%)`,
        boxShadow: `0 6px 20px ${accent}33`,
      }}>
        <div style={{
          fontSize: 20,
          fontWeight: 800,
          color: '#fff',
          letterSpacing: -0.4,
          lineHeight: 1.2,
        }}>
          {title}
        </div>
      </div>
      <p style={{ fontSize: 12, color: '#000', margin: '0 0 2px', lineHeight: 1.5, fontWeight: 500, textAlign: 'center' }}>
        {intro}
      </p>
      {children}
    </div>
  )
}

export function ThreeWaysConnectSection() {
  return (
    <section id="how" className="zdb-section" style={{ padding: '56px 40px 64px', background: '#fff' }}>
      <div style={container(960)}>
        <p style={sectionTitle}>How it works</p>
        <h2 style={{ ...h2, fontSize: 28, marginBottom: 8 }}>Three ways to connect</h2>
        <p style={{ ...lead, fontSize: 15, marginBottom: 28, maxWidth: 520 }}>
          Managed cloud, MCP in Claude / Cursor / OpenAI, or self-hosted — same SDKs and API.
        </p>

        <div
          className="zdb-connect-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 14,
            alignItems: 'start',
          }}
        >
          <ConnectCard
            title="Managed cloud"
            accent={M.violet}
            intro="We run the stack at db.zizka.ai. Sign up, create an agent, copy your API key."
          >
            <ConnectStep n={1} title="Create account" accent={M.violet}>
              <Link href="/signup" style={{ color: M.violet, fontWeight: 700 }}>Sign up</Link>
              {' '}— email OTP, no card.
            </ConnectStep>
            <ConnectStep n={2} title="Create agent & key" accent={M.violet}>
              <Link href="/dashboard" style={{ color: M.violet, fontWeight: 700 }}>Dashboard</Link>
              {' '}→ create agent → copy <code style={{ fontFamily: 'monospace', fontSize: 10 }}>zizkadb_live_…</code>
            </ConnectStep>
            <CodeBlock lang="python">{`pip install zizkadb-sdk
from zizkadb import ZizkaDB
db = ZizkaDB("zizkadb_live_xxxx")
await db.log(agent="my-bot", event="started", data={})`}</CodeBlock>
          </ConnectCard>

          <ConnectCard
            title="MCP"
            accent={M.blue}
            intro="Plug into Claude Desktop, Cursor, or OpenAI MCP. No app refactor."
          >
            <ConnectStep n={1} title="Install" accent={M.blue}>
              <code style={{ fontFamily: 'monospace', fontSize: 10 }}>pip install zizkadb-mcp</code> or{' '}
              <code style={{ fontFamily: 'monospace', fontSize: 10 }}>uvx zizkadb-mcp</code>
            </ConnectStep>
            <ConnectStep n={2} title="Paste & reload" accent={M.blue}>
              Add to Cursor <code style={{ fontFamily: 'monospace', fontSize: 10 }}>mcp.json</code> or Claude Desktop config.
            </ConnectStep>
            <CodeBlock lang="json">{MCP_CONFIG}</CodeBlock>
          </ConnectCard>

          <ConnectCard
            title="Self-hosted"
            accent={M.teal}
            intro="Run on your laptop or VPS — AGPL, free forever. Point SDKs at your API URL."
          >
            <ConnectStep n={1} title="Clone & start" accent={M.teal}>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={{ color: M.teal, fontWeight: 700 }}>GitHub</a>
              {' '}→ <code style={{ fontFamily: 'monospace', fontSize: 10 }}>bash scripts/setup-local.sh</code>
            </ConnectStep>
            <ConnectStep n={2} title="SDK" accent={M.teal}>
              <code style={{ fontFamily: 'monospace', fontSize: 10 }}>pip install zizkadb-sdk</code>
              {' · '}
              <code style={{ fontFamily: 'monospace', fontSize: 10 }}>npm i zizkadb-sdk</code>
            </ConnectStep>
            <CodeBlock lang="python">{`from zizkadb import ZizkaDB
db = ZizkaDB(host="http://localhost:8000")
await db.log(agent="my-bot", event="started", data={})`}</CodeBlock>
            <p style={{ fontSize: 11, margin: '10px 0 0', fontWeight: 700 }}>
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
