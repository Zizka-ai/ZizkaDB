'use client'

import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { M } from './marketing-theme'
import { BRAND, BRAND_LIGHT } from '@/components/brand'

type TabId = 'activity' | 'behavior' | 'reports' | 'suggestions' | 'fleet'

type Props = {
  variant: 'oss' | 'managed'
  /** Auto-rotate tabs every N ms; 0 = off */
  autoRotateMs?: number
}

const OSS_TABS: { id: TabId; label: string }[] = [
  { id: 'activity', label: 'Activity' },
  { id: 'behavior', label: 'Behavior' },
  { id: 'reports', label: 'Reports' },
  { id: 'suggestions', label: 'Suggestions' },
]

const MANAGED_TABS = [...OSS_TABS, { id: 'fleet' as const, label: 'Fleet' }]

export function LiveDashboardDemo({ variant, autoRotateMs = 0 }: Props) {
  const tabs = variant === 'managed' ? MANAGED_TABS : OSS_TABS
  const [active, setActive] = useState<TabId>('activity')

  const rotate = useCallback(() => {
    setActive((prev) => {
      const idx = tabs.findIndex((t) => t.id === prev)
      return tabs[(idx + 1) % tabs.length].id
    })
  }, [tabs])

  useEffect(() => {
    if (!autoRotateMs) return
    const id = window.setInterval(rotate, autoRotateMs)
    return () => window.clearInterval(id)
  }, [autoRotateMs, rotate])

  return (
    <div
      style={{
        borderRadius: 16,
        border: `1px solid ${M.previewBorder}`,
        background: M.previewBg,
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: `1px solid ${M.line}`,
          background: M.previewSurface,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#fbbf24' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
        </div>
        <span style={{ fontSize: 12, color: M.faint, fontWeight: 500 }}>
          {variant === 'managed' ? 'Managed cloud' : 'Self-hosted'} · demo
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: '10px 12px 0',
          borderBottom: `1px solid ${M.line}`,
          overflowX: 'auto',
        }}
      >
        {tabs.map((tab) => {
          const on = active === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              style={{
                flexShrink: 0,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: on ? 600 : 500,
                color: on ? M.ink : M.muted,
                background: on ? 'rgba(249,115,22,0.12)' : 'transparent',
                border: 'none',
                borderBottom: on ? `2px solid ${BRAND}` : '2px solid transparent',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div style={{ padding: 16, minHeight: 220 }}>
        {active === 'activity' && <ActivityPanel />}
        {active === 'behavior' && <BehaviorPanel />}
        {active === 'reports' && <ReportsPanel />}
        {active === 'suggestions' && <SuggestionsPanel />}
        {active === 'fleet' && variant === 'managed' && <FleetPanel />}
      </div>
    </div>
  )
}

function ActivityPanel() {
  const rows = [
    { time: '14:02:11', event: 'tool_call', detail: 'search_policy_docs', status: 'ok' },
    { time: '14:02:09', event: 'llm_response', detail: 'Refund window is 14 days…', status: 'warn' },
    { time: '14:01:58', event: 'session_start', detail: 'customer-4821', status: 'ok' },
  ]
  return (
    <div>
      <PanelTitle>Recent sessions</PanelTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((r) => (
          <div
            key={r.time + r.detail}
            className="zdb-demo-activity-row"
            style={{
              display: 'grid',
              gridTemplateColumns: '72px 88px 1fr 56px',
              gap: 8,
              alignItems: 'center',
              padding: '10px 12px',
              borderRadius: 10,
              background: M.previewSurface,
              fontSize: 12,
            }}
          >
            <span style={{ color: M.faint, fontFamily: 'monospace' }}>{r.time}</span>
            <span style={{ color: BRAND_LIGHT, fontWeight: 600 }}>{r.event}</span>
            <span style={{ color: M.inkSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.detail}
            </span>
            <StatusPill status={r.status} />
          </div>
        ))}
      </div>
    </div>
  )
}

function BehaviorPanel() {
  return (
    <div>
      <PanelTitle>Baseline vs last 24h</PanelTitle>
      <div className="zdb-demo-behavior-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <MetricCard label="Tool accuracy" value="94%" delta="-6%" bad />
        <MetricCard label="Avg tokens" value="1.2k" delta="+18%" bad />
        <MetricCard label="Escalations" value="3" delta="+2" bad />
      </div>
      <p style={{ margin: '14px 0 0', fontSize: 12, color: M.muted, lineHeight: 1.5 }}>
        Drift detected after prompt v2 deploy — refund answers shifted from policy doc to stale FAQ chunk.
      </p>
    </div>
  )
}

function ReportsPanel() {
  return (
    <div>
      <PanelTitle>Behavior change report</PanelTitle>
      <div
        style={{
          padding: 14,
          borderRadius: 10,
          background: M.previewSurface,
          border: `1px solid ${M.line}`,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: M.ink, marginBottom: 8 }}>
          Weekly summary · support-bot
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: M.muted, lineHeight: 1.65 }}>
          <li>Refund intent answers diverged from baseline on Tue</li>
          <li>3 sessions flagged for manual review</li>
          <li>Recommended: roll back prompt v2, refresh FAQ embeddings</li>
        </ul>
      </div>
    </div>
  )
}

function SuggestionsPanel() {
  const items = [
    { title: 'Pin policy doc for refund intent', impact: 'High' },
    { title: 'Add guardrail on FAQ retrieval', impact: 'Medium' },
    { title: 'Re-run baseline after prompt fix', impact: 'Low' },
  ]
  return (
    <div>
      <PanelTitle>Suggested fixes</PanelTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item) => (
          <div
            key={item.title}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 12px',
              borderRadius: 10,
              background: M.previewSurface,
              fontSize: 12,
            }}
          >
            <span style={{ color: M.inkSoft }}>{item.title}</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 99,
                background: 'rgba(249,115,22,0.15)',
                color: BRAND_LIGHT,
              }}
            >
              {item.impact}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FleetPanel() {
  const agents = [
    { name: 'support-bot', score: 72, trend: 'down' },
    { name: 'sales-assistant', score: 91, trend: 'up' },
    { name: 'onboarding', score: 88, trend: 'flat' },
  ]
  return (
    <div>
      <PanelTitle>Fleet ranking</PanelTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {agents.map((a, i) => (
          <div
            key={a.name}
            style={{
              display: 'grid',
              gridTemplateColumns: '24px 1fr 48px 32px',
              gap: 10,
              alignItems: 'center',
              padding: '10px 12px',
              borderRadius: 10,
              background: M.previewSurface,
              fontSize: 12,
            }}
          >
            <span style={{ color: M.faint, fontWeight: 700 }}>#{i + 1}</span>
            <span style={{ color: M.inkSoft, fontWeight: 500 }}>{a.name}</span>
            <span style={{ color: M.ink, fontWeight: 700, textAlign: 'right' }}>{a.score}</span>
            <span style={{ color: a.trend === 'down' ? M.danger : a.trend === 'up' ? M.success : M.faint }}>
              {a.trend === 'down' ? '↓' : a.trend === 'up' ? '↑' : '→'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PanelTitle({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: M.faint, marginBottom: 12, textTransform: 'uppercase' }}>
      {children}
    </div>
  )
}

function MetricCard({ label, value, delta, bad }: { label: string; value: string; delta: string; bad?: boolean }) {
  return (
    <div style={{ padding: 12, borderRadius: 10, background: M.previewSurface, textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: M.faint, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: M.ink }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: bad ? M.danger : M.success, marginTop: 4 }}>{delta}</div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const color = status === 'ok' ? M.success : status === 'warn' ? M.warn : M.danger
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase' }}>
      {status}
    </span>
  )
}
