'use client';

import { useEffect, useState } from 'react';
import { BRAND } from '@/components/brand';
import {
  Activity,
  AlertCircle,
  BarChart2,
  ChevronLeft,
  Clock,
  GitBranch,
  Layers,
  RefreshCw,
  Rewind,
  Search,
} from 'lucide-react';

type Scene = 'events' | 'behavior' | 'sessions';

const SCENES: { id: Scene; label: string }[] = [
  { id: 'events', label: 'Events' },
  { id: 'behavior', label: 'Drift alert' },
  { id: 'sessions', label: 'Session replay' },
];

const D = {
  bg: '#0f172a',
  surface: '#1e293b',
  surfaceDeep: '#172033',
  border: 'rgba(148,163,184,0.35)',
  borderLight: 'rgba(148,163,184,0.22)',
  text: '#fff',
  green: '#22c55e',
  greenBg: 'rgba(34,197,94,0.12)',
  greenBorder: 'rgba(34,197,94,0.45)',
  orange: BRAND,
  red: '#ef4444',
  blue: '#60a5fa',
  code: '#4ade80',
} as const;

const FRAME_SHADOW = [
  '0 0 0 1px rgba(255,255,255,0.14)',
  '0 0 0 1px rgba(255,255,255,0.06) inset',
  '0 28px 72px rgba(0,0,0,0.55)',
  '0 0 48px rgba(59,130,246,0.18)',
  '0 0 32px rgba(249,115,22,0.14)',
].join(', ');

const EVENT_COLORS: Record<string, string> = {
  user_message: '#8b5cf6',
  tool_call: '#3b82f6',
  agent_response: '#22c55e',
  error: '#ef4444',
  connection_test: '#3b82f6',
};

const SCENE_HEIGHT = 278;

export function SessionReplayDemo() {
  const [scene, setScene] = useState<Scene>('events');
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto) return;
    const order: Scene[] = ['events', 'behavior', 'sessions'];
    const t = setInterval(() => {
      setScene((prev) => order[(order.indexOf(prev) + 1) % order.length]);
    }, 4500);
    return () => clearInterval(t);
  }, [auto]);

  function pick(s: Scene) {
    setAuto(false);
    setScene(s);
  }

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          inset: '-20px -12px -8px',
          background: `radial-gradient(ellipse at 75% 25%, rgba(59,130,246,0.2) 0%, transparent 52%),
                     radial-gradient(ellipse at 15% 85%, rgba(249,115,22,0.16) 0%, transparent 48%)`,
          pointerEvents: 'none',
          zIndex: 0,
          filter: 'blur(2px)',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 6,
              padding: 4,
              borderRadius: 100,
              background: 'rgba(15,23,42,0.75)',
              border: '1px solid rgba(255,255,255,0.18)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {SCENES.map((s) => (
              <button
                key={s.id}
                type='button'
                onClick={() => pick(s.id)}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '6px 12px',
                  borderRadius: 100,
                  border: scene === s.id ? `1px solid ${D.orange}` : '1px solid transparent',
                  background:
                    scene === s.id
                      ? 'linear-gradient(135deg, rgba(249,115,22,0.28) 0%, rgba(249,115,22,0.12) 100%)'
                      : 'transparent',
                  color: scene === s.id ? '#fff' : 'rgba(255,255,255,0.85)',
                  cursor: 'pointer',
                  boxShadow: scene === s.id ? '0 0 12px rgba(249,115,22,0.25)' : 'none',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: D.green,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 10px',
              borderRadius: 100,
              background: D.greenBg,
              border: `1px solid ${D.greenBorder}`,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: D.green,
                boxShadow: '0 0 8px rgba(34,197,94,0.8)',
              }}
            />
            Live preview
          </span>
        </div>

        <div
          style={{
            padding: 1,
            borderRadius: 16,
            background:
              'linear-gradient(145deg, rgba(255,255,255,0.42) 0%, rgba(249,115,22,0.55) 38%, rgba(59,130,246,0.45) 72%, rgba(255,255,255,0.28) 100%)',
            boxShadow: FRAME_SHADOW,
          }}
        >
          <div
            style={{
              borderRadius: 15,
              overflow: 'hidden',
              background: D.bg,
              minHeight: 520,
            }}
          >
            {/* Window chrome */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                background: 'linear-gradient(180deg, #1e293b 0%, #172033 100%)',
                borderBottom: `1px solid ${D.border}`,
              }}
            >
              <div style={{ display: 'flex', gap: 6 }}>
                {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
                  <span
                    key={c}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: c,
                      boxShadow: '0 0 0 1px rgba(0,0,0,0.25) inset',
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#fff',
                  fontFamily: 'ui-monospace, monospace',
                  padding: '5px 12px',
                  borderRadius: 8,
                  background: 'rgba(15,23,42,0.85)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                dashboard.zizka.ai/agents/support-bot
              </div>
            </div>

            {/* API connected bar — matches ConnectionStatus */}
            <div
              style={{
                margin: '10px 10px 0',
                padding: '8px 12px',
                borderRadius: 10,
                background: D.surface,
                border: `1px solid ${D.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 10,
                color: '#fff',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: D.green,
                  flexShrink: 0,
                }}
              />
              API connected
              <code style={{ fontFamily: 'ui-monospace, monospace', color: D.green }}>
                https://db.zizka.ai
              </code>
            </div>

            <div style={{ padding: '12px 12px 14px' }}>
              {/* Header — matches agent page Shell */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  marginBottom: 10,
                  color: '#fff',
                  fontSize: 11,
                }}
              >
                <ChevronLeft size={12} />
                <span>Agents</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#fff',
                    fontFamily: 'ui-monospace, monospace',
                  }}
                >
                  support-bot
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 10,
                    color: D.green,
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: D.green,
                      boxShadow: '0 0 6px rgba(34,197,94,0.6)',
                    }}
                  />
                  Live · less than a minute ago
                </div>
              </div>

              {/* Stats row — matches StatsRow */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: 6,
                  marginBottom: 12,
                }}
              >
                {[
                  { label: 'Total events', value: '847', icon: BarChart2 },
                  { label: 'Event types', value: '12', icon: GitBranch },
                  { label: 'Sessions', value: '42', icon: Layers },
                  { label: 'Last event', value: '2m ago', icon: Clock },
                  { label: 'Errors', value: '3', icon: AlertCircle, color: D.red },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div
                    key={label}
                    style={{
                      padding: '8px 8px',
                      borderRadius: 10,
                      background: D.surface,
                      border: `1px solid ${D.border}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <Icon size={10} style={{ color: '#fff' }} />
                      <span style={{ fontSize: 9, color: '#fff', fontWeight: 600 }}>{label}</span>
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        fontFamily: 'ui-monospace, monospace',
                        color: color ?? D.text,
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tab bar — matches agent page tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: 3,
                  padding: 3,
                  marginBottom: 12,
                  background: D.surfaceDeep,
                  border: `1px solid ${D.border}`,
                  borderRadius: 10,
                }}
              >
                {[
                  { key: 'Behavior', icon: Activity, badge: 'NEW' as const },
                  { key: 'Events', icon: BarChart2 },
                  { key: 'Sessions', icon: Layers },
                  { key: 'Time Travel', icon: Rewind },
                ].map(({ key, icon: Icon, badge }) => {
                  const isBehavior = key === 'Behavior';
                  const isEvents = key === 'Events';
                  const isSessions = key === 'Sessions';
                  const highlighted =
                    (scene === 'behavior' && isBehavior) ||
                    (scene === 'events' && isEvents) ||
                    (scene === 'sessions' && isSessions);
                  return (
                    <div
                      key={key}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        padding: '6px 4px',
                        borderRadius: 7,
                        fontSize: 9,
                        background: highlighted ? 'rgba(255,255,255,0.08)' : 'transparent',
                        color: '#fff',
                        fontWeight: highlighted ? 700 : 500,
                        border: highlighted
                          ? `1px solid rgba(255,255,255,0.18)`
                          : '1px solid transparent',
                        boxShadow: highlighted ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                      }}
                    >
                      <Icon size={10} />
                      <span>{key}</span>
                      {badge && (
                        <span
                          style={{
                            fontSize: 7,
                            fontWeight: 800,
                            padding: '1px 4px',
                            borderRadius: 3,
                            background: D.orange,
                            color: '#fff',
                            letterSpacing: 0.4,
                          }}
                        >
                          {badge}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ position: 'relative', height: SCENE_HEIGHT, overflow: 'hidden' }}>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: scene === 'events' ? 1 : 0,
                    transition: 'opacity 0.25s ease',
                    pointerEvents: scene === 'events' ? 'auto' : 'none',
                  }}
                >
                  <EventsScene />
                </div>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: scene === 'behavior' ? 1 : 0,
                    transition: 'opacity 0.25s ease',
                    pointerEvents: scene === 'behavior' ? 'auto' : 'none',
                  }}
                >
                  <BehaviorScene />
                </div>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: scene === 'sessions' ? 1 : 0,
                    transition: 'opacity 0.25s ease',
                    pointerEvents: scene === 'sessions' ? 'auto' : 'none',
                  }}
                >
                  <SessionsScene />
                </div>
              </div>
            </div>
          </div>
        </div>

        <p
          style={{
            textAlign: 'center',
            fontSize: 11,
            fontWeight: 600,
            color: '#fff',
            marginTop: 12,
            marginBottom: 0,
            opacity: 0.92,
          }}
        >
          The same dashboard you get after signup.
        </p>
      </div>
    </div>
  );
}

function EventsScene() {
  const events = [
    {
      type: 'user_message',
      data: '{"text":"Why was I charged twice this month?"}',
      time: '15:42:01',
      seq: 1,
    },
    {
      type: 'tool_call',
      data: '{"fn":"get_billing","user":8821}',
      time: '15:42:02',
      seq: 2,
      causal: true,
    },
    {
      type: 'tool_call',
      data: '{"duplicate_charge":true}',
      time: '15:42:02',
      seq: 3,
      causal: true,
    },
    {
      type: 'agent_response',
      data: '{"text":"I don\'t see a duplicate charge."}',
      time: '15:42:03',
      seq: 4,
      warn: true,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '0 10px',
            borderRadius: 8,
            background: D.surface,
            border: `1px solid ${D.border}`,
          }}
        >
          <Search size={11} style={{ color: '#fff' }} />
          <span style={{ fontSize: 10, color: '#fff', padding: '7px 0', fontWeight: 500 }}>
            Semantic search across events…
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '0 10px',
            borderRadius: 8,
            background: D.surface,
            border: `1px solid ${D.border}`,
            color: '#fff',
            fontSize: 10,
            fontWeight: 600,
          }}
        >
          <RefreshCw size={10} />
          Refresh
        </div>
      </div>

      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
        <FilterPill label='All' active />
        <FilterPill label='user_message (1)' color={EVENT_COLORS.user_message} />
        <FilterPill label='tool_call (2)' color={EVENT_COLORS.tool_call} />
        <FilterPill label='agent_response (1)' color={EVENT_COLORS.agent_response} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {events.map((ev) => (
          <DashboardEventRow key={ev.seq} {...ev} />
        ))}
      </div>
    </div>
  );
}

function BehaviorScene() {
  return (
    <div
      style={{
        padding: '14px 14px',
        borderRadius: 10,
        background: 'linear-gradient(135deg, rgba(249,115,22,0.18) 0%, rgba(15,23,42,0.95) 100%)',
        border: `1px solid rgba(249,115,22,0.55)`,
        boxShadow: '0 0 24px rgba(249,115,22,0.12) inset',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Activity size={12} style={{ color: D.orange }} />
        <span style={{ fontSize: 9, fontWeight: 800, color: D.orange, letterSpacing: 0.6 }}>
          NOTICEABLE DRIFT
        </span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
        Drift score: <span style={{ fontFamily: 'ui-monospace, monospace' }}>0.31</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: D.orange, marginLeft: 6 }}>
          (31 / 100)
        </span>
      </div>
      <div
        style={{ fontSize: 11, color: '#fff', lineHeight: 1.55, marginBottom: 10, fontWeight: 500 }}
      >
        Billing responses changed after prompt v2. Policy links dropped 40%.
      </div>
      <div style={{ height: 5, borderRadius: 100, background: '#0a0a0a', overflow: 'hidden' }}>
        <div style={{ width: '31%', height: '100%', borderRadius: 100, background: D.orange }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 10 }}>
        {[
          { label: 'Sessions affected', value: '23 today', color: D.orange },
          { label: 'Error rate change', value: '+2.4pp', color: D.red },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              background: D.surfaceDeep,
              border: `1px solid ${D.border}`,
            }}
          >
            <div style={{ fontSize: 9, color: '#fff', marginBottom: 2, fontWeight: 600 }}>
              {item.label}
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'ui-monospace, monospace',
                color: item.color,
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionsScene() {
  const chain = [
    {
      type: 'user_message',
      label: 'user_message',
      data: '{"text":"Why was I charged twice?"}',
      root: true,
    },
    { type: 'tool_call', label: 'tool_call', data: '{"fn":"get_billing","user":8821}' },
    { type: 'tool_call', label: 'tool_call', data: '{"duplicate_charge":true}', bad: true },
    {
      type: 'agent_response',
      label: 'agent_response',
      data: '{"text":"No duplicate found"}',
      bad: true,
      selected: true,
    },
  ];

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#fff', marginBottom: 10 }}>
        Session sess_8821… · {chain.length} events in causal chain
      </div>
      {chain.map((e, i) => (
        <div
          key={i}
          style={{ display: 'flex', gap: 10, marginBottom: i < chain.length - 1 ? 0 : 0 }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <EventDot type={e.type} />
            {i < chain.length - 1 && (
              <div
                style={{
                  width: 1,
                  flex: 1,
                  minHeight: 12,
                  background: D.borderLight,
                  margin: '3px 0',
                }}
              />
            )}
          </div>
          <div style={{ paddingBottom: 10, flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', color: D.text }}>
                {e.label}
              </span>
              {e.root && <Badge label='root' color={D.green} bg='#1a2a1a' />}
              {e.selected && <Badge label='selected' color={D.red} bg='#2a1a1a' />}
              {e.bad && !e.selected && (
                <Badge label='ignored' color={D.red} bg='rgba(239,68,68,0.12)' />
              )}
            </div>
            <div
              style={{
                fontSize: 10,
                fontFamily: 'ui-monospace, monospace',
                marginTop: 3,
                color: e.bad ? D.red : D.code,
                lineHeight: 1.4,
              }}
            >
              {e.data}
            </div>
          </div>
        </div>
      ))}
      <div
        style={{
          marginTop: 4,
          padding: '8px 10px',
          borderRadius: 8,
          background: D.greenBg,
          border: `1px solid ${D.greenBorder}`,
          fontSize: 10,
          color: D.green,
          fontWeight: 700,
        }}
      >
        Root cause found. Roll back prompt v2.
      </div>
    </div>
  );
}

function DashboardEventRow({
  type,
  data,
  time,
  seq,
  causal,
  warn,
}: {
  type: string;
  data: string;
  time: string;
  seq: number;
  causal?: boolean;
  warn?: boolean;
}) {
  return (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: 8,
        background: warn ? 'rgba(249,115,22,0.12)' : D.surface,
        border: `1px solid ${warn ? 'rgba(249,115,22,0.5)' : D.border}`,
        boxShadow: warn ? '0 0 16px rgba(249,115,22,0.08)' : 'none',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <EventDot type={type} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace', color: D.text }}>
                {type}
              </span>
              {causal && <Badge label='causal' color={D.green} bg='#1a2a1a' />}
              {warn && <AlertCircle size={11} style={{ color: D.orange }} />}
            </div>
            <div
              style={{
                fontSize: 10,
                fontFamily: 'ui-monospace, monospace',
                marginTop: 3,
                color: D.code,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {data}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span
            style={{
              fontSize: 9,
              fontFamily: 'ui-monospace, monospace',
              color: D.blue,
              fontWeight: 600,
            }}
          >
            #{seq}
          </span>
          <span
            style={{
              fontSize: 9,
              fontFamily: 'ui-monospace, monospace',
              color: '#fff',
              fontWeight: 600,
            }}
          >
            {time}
          </span>
        </div>
      </div>
    </div>
  );
}

function FilterPill({ label, active, color }: { label: string; active?: boolean; color?: string }) {
  const c = color ?? D.green;
  return (
    <span
      style={{
        fontSize: 9,
        padding: '3px 8px',
        borderRadius: 100,
        background: active ? `${c}20` : D.surface,
        color: active ? c : '#fff',
        border: `1px solid ${active ? `${c}40` : D.border}`,
      }}
    >
      {label}
    </span>
  );
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span
      style={{
        fontSize: 8,
        fontWeight: 700,
        padding: '1px 5px',
        borderRadius: 4,
        background: bg,
        color,
      }}
    >
      {label}
    </span>
  );
}

function EventDot({ type }: { type: string }) {
  return (
    <div
      style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        flexShrink: 0,
        marginTop: 3,
        background: EVENT_COLORS[type] ?? D.blue,
      }}
    />
  );
}
