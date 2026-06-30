'use client';

import { useState } from 'react';
import { BRAND, BRAND_LIGHT } from '@/components/brand';
import { M } from './marketing-theme';

type Tab = 'agents' | 'drift' | 'session';

const TABS: { id: Tab; label: string; color: string }[] = [
  { id: 'agents', label: 'All agents', color: M.blueLight },
  { id: 'drift', label: 'Drift alert', color: BRAND },
  { id: 'session', label: 'Session replay', color: M.teal },
];

export function ProductPreview() {
  const [tab, setTab] = useState<Tab>('drift');

  return (
    <div style={{ position: 'relative' }}>
      {/* Glow behind demo */}
      <div
        style={{
          position: 'absolute',
          inset: '-20px -12px -12px',
          background: `radial-gradient(ellipse at 60% 40%, rgba(59,130,246,0.15) 0%, transparent 50%),
                     radial-gradient(ellipse at 30% 70%, rgba(249,115,22,0.12) 0%, transparent 45%)`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div
        className='zdb-product-preview'
        style={{
          position: 'relative',
          zIndex: 1,
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid rgba(59,130,246,0.25)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset',
          background: M.previewBg,
        }}
      >
        {/* Window chrome */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '11px 16px',
            background: 'linear-gradient(180deg, #1e293b 0%, #172033 100%)',
            borderBottom: `1px solid ${M.previewBorder}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#ff5f57' }} />
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#febc2e' }} />
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#28c840' }} />
            <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>
              ZizkaDB Dashboard
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                type='button'
                onClick={() => setTab(t.id)}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 100,
                  border: tab === t.id ? `1px solid ${t.color}` : '1px solid transparent',
                  background: tab === t.id ? `${t.color}22` : 'transparent',
                  color: tab === t.id ? t.color : '#64748b',
                  cursor: 'pointer',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'agents' && <AgentsView />}
        {tab === 'drift' && <DriftView />}
        {tab === 'session' && <SessionView />}
      </div>

      <p
        style={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          fontSize: 12,
          color: '#64748b',
          marginTop: 12,
          marginBottom: 0,
        }}
      >
        Live product view. Click tabs to explore.
      </p>
    </div>
  );
}

function AgentsView() {
  const agents = [
    { name: 'support-bot', events: '1,284', sessions: 42, drift: 0.24, status: 'alert' as const },
    { name: 'sales-agent', events: '892', sessions: 18, drift: 0.06, status: 'ok' as const },
    { name: 'onboarding-bot', events: '410', sessions: 31, drift: 0.09, status: 'ok' as const },
  ];
  return (
    <div style={{ padding: '18px 20px', minHeight: 320 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 14 }}>
        Your agents at a glance
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {agents.map((a) => (
          <div
            key={a.name}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto auto',
              gap: 16,
              alignItems: 'center',
              padding: '14px 16px',
              borderRadius: 12,
              background: M.previewSurface,
              border: `1px solid ${M.previewBorder}`,
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{a.name}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                {a.events} events · {a.sessions} sessions
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: '#64748b' }}>Drift</div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: a.status === 'alert' ? BRAND : M.teal,
                }}
              >
                {a.drift.toFixed(2)}
              </div>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 100,
                background:
                  a.status === 'alert' ? 'rgba(249,115,22,0.15)' : 'rgba(13,148,136,0.15)',
                color: a.status === 'alert' ? BRAND_LIGHT : '#5eead4',
                border: `1px solid ${a.status === 'alert' ? 'rgba(249,115,22,0.35)' : 'rgba(13,148,136,0.35)'}`,
              }}
            >
              {a.status === 'alert' ? 'Needs review' : 'Healthy'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DriftView() {
  return (
    <div style={{ display: 'flex', minHeight: 320 }}>
      <div
        style={{
          width: 140,
          flexShrink: 0,
          borderRight: `1px solid ${M.previewBorder}`,
          padding: '14px 10px',
          background: '#070d1a',
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#475569',
            letterSpacing: 0.8,
            marginBottom: 10,
          }}
        >
          AGENTS
        </div>
        {['support-bot', 'sales-agent', 'onboarding-bot'].map((name, i) => (
          <div
            key={name}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              marginBottom: 4,
              fontSize: 12,
              background: i === 0 ? '#1e293b' : 'transparent',
              color: i === 0 ? '#fff' : '#64748b',
              border: i === 0 ? `1px solid ${M.blueLight}44` : '1px solid transparent',
            }}
          >
            {name}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, padding: '16px 18px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>support-bot</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              Behavior monitoring · last 7 days
            </div>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: BRAND_LIGHT,
              background: 'rgba(249,115,22,0.18)',
              border: '1px solid rgba(249,115,22,0.4)',
              padding: '5px 12px',
              borderRadius: 8,
            }}
          >
            Drift detected
          </span>
        </div>

        <div
          style={{
            background: M.previewSurface,
            borderRadius: 12,
            padding: '14px 16px',
            border: `1px solid ${M.previewBorder}`,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11,
              marginBottom: 10,
            }}
          >
            <span style={{ color: '#94a3b8' }}>Behavior vs baseline</span>
            <span style={{ color: BRAND, fontWeight: 700 }}>0.24 · noticeable shift</span>
          </div>
          <div style={{ height: 8, borderRadius: 100, background: '#1e293b', overflow: 'hidden' }}>
            <div
              style={{
                width: '48%',
                height: '100%',
                background: `linear-gradient(90deg, ${M.blueLight} 0%, ${BRAND} 100%)`,
                borderRadius: 100,
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 10 }}>
            Started after prompt update on Tuesday. Refund answers changed tone and policy citations
            dropped 40%.
          </div>
        </div>

        <div
          style={{
            background:
              'linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(249,115,22,0.08) 100%)',
            borderRadius: 12,
            padding: '12px 14px',
            border: '1px solid rgba(59,130,246,0.2)',
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: M.blueLight,
              letterSpacing: 0.6,
              marginBottom: 8,
            }}
          >
            WHAT CHANGED
          </div>
          {[
            'Shorter answers on billing questions',
            'Fewer links to refund policy',
            'More escalations to human support',
          ].map((line) => (
            <div
              key={line}
              style={{
                fontSize: 12,
                color: '#cbd5e1',
                marginBottom: 4,
                paddingLeft: 12,
                borderLeft: `2px solid ${M.blueLight}`,
              }}
            >
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SessionView() {
  return (
    <div style={{ padding: '16px 18px', minHeight: 320 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>Session replay</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            support-bot · Tue 3:42 PM · user #8821
          </div>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#5eead4',
            background: 'rgba(13,148,136,0.15)',
            border: '1px solid rgba(13,148,136,0.35)',
            padding: '4px 10px',
            borderRadius: 100,
          }}
        >
          Full trail
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          {
            type: 'Customer asked',
            text: '"Why was I charged twice this month?"',
            color: M.blueLight,
          },
          { type: 'Agent checked', text: 'Billing history for account #8821', color: M.teal },
          { type: 'Agent found', text: 'Duplicate charge flag from March 12', color: M.teal },
          {
            type: 'Agent replied',
            text: '"I see a duplicate charge. I can start a refund now."',
            color: BRAND,
          },
        ].map((step, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 10,
              background: M.previewSurface,
              border: `1px solid ${M.previewBorder}`,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                flexShrink: 0,
                background: `${step.color}22`,
                border: `1px solid ${step.color}55`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 800,
                color: step.color,
              }}
            >
              {i + 1}
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: step.color, marginBottom: 3 }}>
                {step.type}
              </div>
              <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.45 }}>{step.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
