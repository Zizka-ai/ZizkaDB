import { M } from './marketing-theme'

const INTEGRATIONS = [
  { name: 'Python SDK', sub: 'pip install zizkadb-sdk' },
  { name: 'TypeScript SDK', sub: 'npm i zizkadb-sdk' },
  { name: 'Cursor MCP', sub: 'Native tools' },
  { name: 'REST API', sub: 'Any language' },
  { name: 'Open source', sub: 'AGPL · self-host' },
  { name: 'Managed cloud', sub: 'db.zizka.ai' },
]

export function IntegrationStrip({ dark = false }: { dark?: boolean }) {
  const text = dark ? '#fff' : '#000'
  const subText = dark ? '#ffffff' : '#000000'
  return (
    <div>
      <p style={{
        fontSize: 13, fontWeight: 700, textAlign: 'center', marginBottom: 14,
        color: text, letterSpacing: 0.3,
      }}>
        Works with your stack
      </p>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center',
      }}>
        {INTEGRATIONS.map(item => (
          <div
            key={item.name}
            className="zdb-integration-pill"
            style={{
              padding: '10px 14px', borderRadius: 12,
              background: dark ? 'rgba(255,255,255,0.08)' : '#fff',
              border: dark ? '1px solid rgba(255,255,255,0.2)' : `1px solid ${M.line}`,
              minWidth: 120, textAlign: 'center',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: text }}>
              {item.name}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: subText, marginTop: 2 }}>
              {item.sub}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
