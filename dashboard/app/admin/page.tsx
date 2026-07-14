"use client";

import { useEffect, useState } from "react";
import {
  adminRequestOtp,
  adminVerifyOtp,
  adminOverview,
  adminTelemetrySummary,
  adminTelemetryRecent,
  adminManagedOverview,
  adminManagedSubscribers,
  adminManagedUsers,
  adminManagedUsage,
  adminDemoRequests,
  adminMarketingSubscriptions,
} from '@/lib/api'
import { format, formatDistanceToNow } from 'date-fns'

import { setAdminToken, clearAdminToken, getAdminToken } from "@/lib/auth";
import { FOUNDER_EMAIL, POLL_INTERVAL_MS, OTP_LENGTH } from "@/lib/constants";

const ADMIN_EMAIL = 'founder@zizka.ai'

type Section = 'subscribers' | 'managed' | 'telemetry' | 'demo_requests' | 'marketing_subscriptions'

interface Overview {
  telemetry: { total_installs?: number; active_7d?: number; active_24h?: number; total_pings?: number }
  managed:   { users?: number; tenants?: number; active_keys?: number; total_events?: number; events_24h?: number }
}

interface TelemetrySummary {
  by_sdk:     { sdk: string; installs: number; pings: number }[]
  by_mode:    { mode: string; installs: number }[]
  by_os:      { os: string; installs: number }[]
  by_version: { sdk: string; sdk_version: string; installs: number }[]
  daily_new_installs: { day: string; new_installs: number }[]
}

interface TelemetryPing {
  install_id:  string
  sdk:         string
  sdk_version: string
  runtime:     string
  os:          string
  mode:        string
  first_seen:  string
  last_seen:   string
  ping_count:  number
}

interface ManagedApiKey {
  name: string
  prefix: string
  created_at: string | null
  last_used: string | null
}

interface ManagedUser {
  user_id:      string
  email:        string
  tenant_id:    string | null
  tenant_name:  string | null
  tenant_created_at: string | null
  created_at:   string | null
  last_login:   string | null
  active_keys:  number
  agent_count:  number
  total_events: number
  events_7d:    number
  last_event:   string | null
  api_keys:     ManagedApiKey[]
  customer_status: 'active' | 'signed_up' | 'registered'
  plan: string | null
  subscription_status: string | null
  trial_ends_at: string | null
}

interface ManagedOverview {
  total_users?: number
  signups_7d?: number
  subscribers?: number
  trialing?: number
  active_paid?: number
  users_with_keys?: number
  tenants_active_7d?: number
}

interface Subscriber {
  user_id: string
  email: string
  plan: string | null
  subscription_status: string | null
  trial_ends_at: string | null
  created_at: string | null
  last_login: string | null
  tenant_id: string | null
  tenant_name: string | null
  active_keys: number
  events_7d: number
}

interface ManagedUsage {
  daily: { day: string; events: number; tenants_active: number }[]
  top_tenants_7d: { tenant_id: string; name: string; owner: string | null; events_7d: number }[]
}

interface DemoRequest {
  request_id: string
  first_name: string
  last_name: string
  email: string
  company_name: string
  website: string
  position: string | null
  source: string | null
  ip_address: string | null
  created_at: string | null
}

interface MarketingSubscription {
  subscription_id: string
  email: string
  source: string
  ip_address: string | null
  created_at: string | null
}


export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [bootDone, setBootDone] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(getAdminToken());
    }
    setBootDone(true);
  }, []);

  if (!bootDone) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0a0a0a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#737373",
          fontSize: 14,
        }}
      >
        Loading…
      </div>
    );
  }
  if (!token) {
    return (
      <Login
        onAuthed={(t) => {
          setAdminToken(t);
          setToken(t);
        }}
      />
    );
  }
  return (
    <Dashboard
      token={token}
      onLogout={() => {
        clearAdminToken();
        setToken(null);
      }}
    />
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────

function Login({ onAuthed }: { onAuthed: (t: string) => void }) {
  const [step, setStep] = useState<"request" | "verify">("request");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const send = async () => {
    setBusy(true);
    setErr("");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      await adminRequestOtp(ADMIN_EMAIL, controller.signal);
      setStep("verify");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setErr(
          "Request timed out. The API may be down — check docker logs for zizkadb_api.",
        );
      } else {
        setErr(e instanceof Error ? e.message : "Failed");
      }
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setErr("");
    try {
      const { access_token } = await adminVerifyOtp(ADMIN_EMAIL, otp.trim());
      onAuthed(access_token);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#e5e5e5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: 360,
          padding: "32px 28px",
          background: "#111",
          border: "1px solid #1f1f1f",
          borderRadius: 14,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#f97316",
            letterSpacing: 1.5,
            marginBottom: 6,
          }}
        >
          ADMIN
        </div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            margin: "0 0 6px",
            color: "#fff",
          }}
        >
          ZizkaDB control room
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "#737373",
            margin: "0 0 24px",
            lineHeight: 1.5,
          }}
        >
          {step === "request"
            ? `We will email a 6-digit code to ${ADMIN_EMAIL}.`
            : `Check ${ADMIN_EMAIL} for the 6-digit code.`}
        </p>

        {step === "request" ? (
          <button onClick={send} disabled={busy} style={btnPrimary(busy)}>
            {busy ? "Sending…" : "Send login code"}
          </button>
        ) : (
          <>
            <input
              autoFocus
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))
              }
              onKeyDown={(e) =>
                e.key === "Enter" && otp.length === OTP_LENGTH && verify()
              }
              placeholder="123456"
              maxLength={OTP_LENGTH}
              style={{
                width: "100%",
                padding: "12px 14px",
                marginBottom: 12,
                background: "#0a0a0a",
                border: "1px solid #2a2a2a",
                borderRadius: 8,
                color: "#fff",
                fontSize: 18,
                fontFamily: "monospace",
                letterSpacing: 6,
                textAlign: "center",
                outline: "none",
              }}
            />
            <button
              onClick={verify}
              disabled={busy || otp.length !== OTP_LENGTH}
              style={btnPrimary(busy || otp.length !== OTP_LENGTH)}
            >
              {busy ? "Verifying…" : "Sign in"}
            </button>
            <button
              onClick={() => {
                setStep("request");
                setOtp("");
                setErr("");
              }}
              style={{
                width: "100%",
                marginTop: 10,
                padding: "8px",
                background: "none",
                border: "none",
                color: "#737373",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Send a new code
            </button>
          </>
        )}

        {err && (
          <div
            style={{
              marginTop: 16,
              padding: "10px 12px",
              background: "#1a0000",
              border: "1px solid #ef444440",
              borderRadius: 8,
              color: "#f87171",
              fontSize: 13,
            }}
          >
            {err}
          </div>
        )}
      </div>
    </div>
  );
}

function btnPrimary(disabled: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px",
    background: disabled ? "#262626" : "#f97316",
    color: disabled ? "#525252" : "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.15s",
  };
}

function btnSmall(): React.CSSProperties {
  return {
    padding: "8px 14px",
    background: "#1a1a1a",
    color: "#d4d4d4",
    border: "1px solid #2a2a2a",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
  };
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({
  token,
  onLogout,
}: {
  token: string;
  onLogout: () => void;
}) {
  const [section, setSection] = useState<Section>("subscribers");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadOverview = () => {
      adminOverview(token)
        .then((data) => {
          if (!cancelled) setOverview(data);
        })
        .catch((e) => {
          if (cancelled) return;
          if (String(e?.message).includes("Not Found")) onLogout();
          else setErr(e instanceof Error ? e.message : "Failed to load");
        });
    };

    loadOverview();
    const interval = setInterval(loadOverview, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token, onLogout]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#e5e5e5",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 32px",
          borderBottom: "1px solid #1f1f1f",
          background: "#0d0d0d",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: "#f97316",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            A
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>
            ZizkaDB
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#f97316",
              letterSpacing: 1.5,
            }}
          >
            ADMIN
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 13,
            color: "#737373",
          }}
        >
          <span>{ADMIN_EMAIL}</span>
          <button
            onClick={onLogout}
            style={{
              background: "none",
              border: "1px solid #2a2a2a",
              color: "#a3a3a3",
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px" }}>
        <OverviewRow overview={overview} />

        <div style={{ display: 'flex', gap: 4, padding: 4, background: '#111',
                      border: '1px solid #1f1f1f', borderRadius: 12, marginTop: 28, marginBottom: 24 }}>
          {([
            { key: 'subscribers', label: 'Subscribers' },
            { key: 'managed',     label: 'All customers' },
            { key: 'telemetry',   label: 'SDKs & telemetry' },
            { key: 'demo_requests', label: 'Demo requests' },
            { key: 'marketing_subscriptions', label: 'Marketing Material Subscriptions' },
          ] as { key: Section; label: string }[]).map((t) => (
            <button key={t.key} onClick={() => setSection(t.key)}
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: 8, border: 'none',
                      background: section === t.key ? '#1a1a1a' : 'transparent',
                      color: section === t.key ? '#fff' : '#737373',
                      fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    }}>
              {t.label}
            </button>
          ))}
        </div>

        {err && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 14px",
              background: "#1a0000",
              border: "1px solid #ef444440",
              borderRadius: 8,
              color: "#f87171",
              fontSize: 13,
            }}
          >
            {err}
          </div>
        )}

        {section === 'subscribers' && <SubscribersSection token={token} />}
        {section === 'managed'     && <ManagedSection   token={token} />}
        {section === 'telemetry'   && <TelemetrySection token={token} />}
        {section === 'demo_requests' && <DemoRequestsSection token={token} />}
        {section === 'marketing_subscriptions' && <MarketingSubscriptionsSection token={token} />}
      </div>
    </div>
  );
}

// ── Top-level numbers ─────────────────────────────────────────────────────────

function OverviewRow({ overview }: { overview: Overview | null }) {
  const t = overview?.telemetry ?? {};
  const m = overview?.managed ?? {};
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 12,
      }}
    >
      <Stat
        label="SDK / MCP installs"
        value={fmt(t.total_installs)}
        sub={`${fmt(t.active_24h)} active in 24h`}
        accent="#f97316"
      />
      <Stat
        label="Telemetry pings"
        value={fmt(t.total_pings)}
        sub={`${fmt(t.active_7d)} active in 7d`}
      />
      <Stat
        label="Managed users"
        value={fmt(m.users)}
        sub={`${fmt(m.tenants)} tenants`}
        accent="#22c55e"
      />
      <Stat
        label="Active API keys"
        value={fmt(m.active_keys)}
        sub="across all tenants"
      />
      <Stat
        label="Events stored"
        value={fmt(m.total_events)}
        sub={`${fmt(m.events_24h)} in 24h`}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: "#111",
        border: "1px solid #1f1f1f",
        borderRadius: 12,
        padding: "16px 18px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#737373",
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          fontFamily: "JetBrains Mono, monospace",
          color: accent ?? "#fff",
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: "#525252", marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ── Telemetry section ────────────────────────────────────────────────────────

function TelemetrySection({ token }: { token: string }) {
  const [summary, setSummary] = useState<TelemetrySummary | null>(null);
  const [recent, setRecent] = useState<TelemetryPing[] | null>(null);

  useEffect(() => {
    adminTelemetrySummary(token)
      .then(setSummary)
      .catch(() => {});
    adminTelemetryRecent(token, 100)
      .then(setRecent)
      .catch(() => {});
  }, [token]);

  if (!summary) return <SkeletonBlock />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card
        title="Anonymous, opt-out telemetry"
        subtitle="One ping per process when an SDK or MCP server starts. Counts unique installs by sdk, version, OS and mode (cloud vs self-hosted). No event data leaves the user's machine."
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr",
            gap: 16,
          }}
        >
          <DistBlock
            title="By SDK"
            rows={summary.by_sdk.map((r) => ({ k: r.sdk, n: r.installs }))}
            accent="#f97316"
          />
          <DistBlock
            title="By mode"
            rows={summary.by_mode.map((r) => ({ k: r.mode, n: r.installs }))}
            accent="#22c55e"
          />
          <DistBlock
            title="By OS"
            rows={summary.by_os.map((r) => ({ k: r.os, n: r.installs }))}
            accent="#3b82f6"
          />
        </div>
      </Card>

      {summary.daily_new_installs.length > 0 && (
        <Card
          title="New installs (last 30 days)"
          subtitle="Daily count of first-ever pings."
        >
          <DailyBars
            data={summary.daily_new_installs.map((d) => ({
              day: d.day,
              value: d.new_installs,
            }))}
            accent="#f97316"
          />
        </Card>
      )}

      {summary.by_version.length > 0 && (
        <Card title="By version" subtitle="Helps you see who is on stale SDKs.">
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid #1f1f1f",
                  color: "#737373",
                  fontSize: 11,
                  textTransform: "uppercase",
                }}
              >
                <Th>SDK</Th>
                <Th>Version</Th>
                <Th align="right">Installs</Th>
              </tr>
            </thead>
            <tbody>
              {summary.by_version.map((r, i) => (
                <tr
                  key={`${r.sdk}-${r.sdk_version}-${i}`}
                  style={{ borderBottom: "1px solid #161616" }}
                >
                  <Td>{r.sdk}</Td>
                  <Td mono>{r.sdk_version}</Td>
                  <Td align="right" mono>
                    {fmt(r.installs)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card
        title="Recent pings"
        subtitle="The most recent install_ids that pinged us. install_id is anonymous and truncated."
      >
        {!recent ? (
          <SkeletonBlock />
        ) : recent.length === 0 ? (
          <Empty>No telemetry pings recorded yet.</Empty>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12.5,
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid #1f1f1f",
                  color: "#737373",
                  fontSize: 11,
                  textTransform: "uppercase",
                }}
              >
                <Th>Install</Th>
                <Th>SDK</Th>
                <Th>Version</Th>
                <Th>Runtime</Th>
                <Th>OS</Th>
                <Th>Mode</Th>
                <Th align="right">Pings</Th>
                <Th align="right">Last seen</Th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr
                  key={r.install_id + r.last_seen}
                  style={{ borderBottom: "1px solid #161616" }}
                >
                  <Td mono>{r.install_id}</Td>
                  <Td>{r.sdk}</Td>
                  <Td mono>{r.sdk_version}</Td>
                  <Td mono>{r.runtime}</Td>
                  <Td>{r.os}</Td>
                  <Td>
                    <Tag color={r.mode === "cloud" ? "#22c55e" : "#f97316"}>
                      {r.mode}
                    </Tag>
                  </Td>
                  <Td align="right" mono>
                    {r.ping_count}
                  </Td>
                  <Td align="right" subtle>
                    {formatDistanceToNow(new Date(r.last_seen), {
                      addSuffix: true,
                    })}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// ── Subscribers (trialing / active / past_due) ───────────────────────────────

function SubscribersSection({ token }: { token: string }) {
  const [rows, setRows] = useState<Subscriber[] | null>(null);
  const [overview, setOverview] = useState<ManagedOverview | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const load = () => {
    adminManagedSubscribers(token, { search, status: statusFilter })
      .then(setRows)
      .catch(() => setRows([]));
  };

  useEffect(() => {
    adminManagedOverview(token)
      .then(setOverview)
      .catch(() => {});
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, statusFilter]);

  const subBadge = (status: string | null) => {
    if (!status) return <Tag color="#737373">unknown</Tag>;
    const colors: Record<string, string> = {
      trialing: "#3b82f6",
      active: "#22c55e",
      past_due: "#f59e0b",
      canceled: "#737373",
    };
    return (
      <Tag color={colors[status] ?? "#a3a3a3"}>{status.replace("_", " ")}</Tag>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {overview && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          <Stat
            label="Subscribers"
            value={fmt(overview.subscribers)}
            sub="trial + active + past due"
            accent="#22c55e"
          />
          <Stat
            label="Trialing"
            value={fmt(overview.trialing)}
            sub="free trial period"
            accent="#3b82f6"
          />
          <Stat
            label="Active paid"
            value={fmt(overview.active_paid)}
            sub="active subscription"
          />
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Search subscriber email…"
          style={{
            flex: "1 1 220px",
            padding: "8px 12px",
            background: "#0a0a0a",
            border: "1px solid #2a2a2a",
            borderRadius: 8,
            color: "#fff",
            fontSize: 13,
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "8px 12px",
            background: "#0a0a0a",
            border: "1px solid #2a2a2a",
            borderRadius: 8,
            color: "#fff",
            fontSize: 13,
          }}
        >
          <option value="">All subscribed</option>
          <option value="trialing">Trialing only</option>
          <option value="active">Active only</option>
          <option value="past_due">Past due</option>
        </select>
        <button type="button" onClick={load} style={btnSmall()}>
          Refresh
        </button>
      </div>

      <Card
        title="Who has subscribed"
        subtitle="Everyone on a Pro/Team trial or paid plan. Email = signup identity."
      >
        {!rows ? (
          <SkeletonBlock />
        ) : rows.length === 0 ? (
          <Empty>
            No subscribers yet. Run DB migration 002_user_billing.sql on the
            server, then restart API. New signups get a 30-day Pro trial
            automatically.
          </Empty>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
                minWidth: 880,
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid #1f1f1f",
                    color: "#737373",
                    fontSize: 11,
                    textTransform: "uppercase",
                  }}
                >
                  <Th>Email</Th>
                  <Th>Plan</Th>
                  <Th>Status</Th>
                  <Th>Trial ends</Th>
                  <Th>Joined</Th>
                  <Th align="right">Keys</Th>
                  <Th align="right">Events 7d</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr
                    key={u.user_id}
                    style={{ borderBottom: "1px solid #161616" }}
                  >
                    <Td>
                      <div style={{ fontWeight: 500 }}>{u.email}</div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "#525252",
                          fontFamily: "monospace",
                          marginTop: 4,
                        }}
                      >
                        {u.tenant_id?.slice(0, 8)}…
                      </div>
                    </Td>
                    <Td mono>{(u.plan ?? "—").toUpperCase()}</Td>
                    <Td>{subBadge(u.subscription_status)}</Td>
                    <Td subtle>
                      {u.trial_ends_at
                        ? format(new Date(u.trial_ends_at), "MMM d, yyyy HH:mm")
                        : "—"}
                    </Td>
                    <Td subtle>
                      {u.created_at
                        ? format(new Date(u.created_at), "MMM d, yyyy")
                        : "—"}
                    </Td>
                    <Td align="right" mono>
                      {u.active_keys}
                    </Td>
                    <Td align="right" mono>
                      {fmt(u.events_7d)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Managed section ──────────────────────────────────────────────────────────

function ManagedSection({ token }: { token: string }) {
  const [users, setUsers] = useState<ManagedUser[] | null>(null);
  const [usage, setUsage] = useState<ManagedUsage | null>(null);
  const [overview, setOverview] = useState<ManagedOverview | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "keys" | "active" | "no_keys">(
    "all",
  );

  const loadUsers = () => {
    const params: { search?: string; has_keys?: boolean; active_7d?: boolean } =
      { search };
    if (filter === "keys") params.has_keys = true;
    if (filter === "no_keys") params.has_keys = false;
    if (filter === "active") params.active_7d = true;
    adminManagedUsers(token, params)
      .then(setUsers)
      .catch(() => setUsers([]));
  };

  useEffect(() => {
    const loadAll = () => {
      adminManagedOverview(token)
        .then(setOverview)
        .catch(() => {});
      adminManagedUsage(token)
        .then(setUsage)
        .catch(() => {});
      loadUsers();
    };
    loadAll();
    const interval = setInterval(loadAll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filter]);

  const statusTag = (status: ManagedUser["customer_status"]) => {
    const colors = {
      active: "#22c55e",
      signed_up: "#3b82f6",
      registered: "#737373",
    };
    const labels = {
      active: "Active (7d events)",
      signed_up: "Has API key",
      registered: "Registered only",
    };
    return <Tag color={colors[status]}>{labels[status]}</Tag>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {overview && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          <Stat
            label="All accounts"
            value={fmt(overview.total_users)}
            sub={`${fmt(overview.subscribers)} subscribed`}
          />
          <Stat
            label="With API keys"
            value={fmt(overview.users_with_keys)}
            sub="started integration"
          />
          <Stat
            label="Active tenants (7d)"
            value={fmt(overview.tenants_active_7d)}
            sub="logged events"
            accent="#f97316"
          />
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadUsers()}
          placeholder="Search email…"
          style={{
            flex: "1 1 200px",
            padding: "8px 12px",
            background: "#0a0a0a",
            border: "1px solid #2a2a2a",
            borderRadius: 8,
            color: "#fff",
            fontSize: 13,
          }}
        />
        <button type="button" onClick={loadUsers} style={btnSmall()}>
          Search
        </button>
        {(["all", "active", "keys", "no_keys"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            style={{
              ...btnSmall(),
              background: filter === f ? "#f97316" : "#1a1a1a",
              color: filter === f ? "#fff" : "#a3a3a3",
            }}
          >
            {f === "all"
              ? "All"
              : f === "active"
                ? "Active 7d"
                : f === "keys"
                  ? "Has keys"
                  : "No keys"}
          </button>
        ))}
      </div>

      {usage && usage.daily.length > 0 && (
        <Card
          title="Events written (last 30 days)"
          subtitle="One event = one db.log() call from a managed customer."
        >
          <DailyBars
            data={usage.daily.map((d) => ({ day: d.day, value: d.events }))}
            accent="#22c55e"
          />
          <div style={{ marginTop: 16, fontSize: 12, color: "#737373" }}>
            Peak day:{" "}
            {
              usage.daily.reduce(
                (a, b) => (b.events > a.events ? b : a),
                usage.daily[0],
              ).day
            }{" "}
            · {fmt(Math.max(...usage.daily.map((d) => d.events)))} events
          </div>
        </Card>
      )}

      <Card
        title="Customers & subscribers"
        subtitle="Managed cloud accounts (db.zizka.ai). Expand rows for API key prefixes and tenant IDs."
      >
        {!users ? (
          <SkeletonBlock />
        ) : users.length === 0 ? (
          <Empty>No customers match this filter.</Empty>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12.5,
                minWidth: 900,
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid #1f1f1f",
                    color: "#737373",
                    fontSize: 11,
                    textTransform: "uppercase",
                  }}
                >
                  <Th>Email / tenant</Th>
                  <Th>Status</Th>
                  <Th>Plan</Th>
                  <Th>Joined</Th>
                  <Th align="right">Agents</Th>
                  <Th align="right">Keys</Th>
                  <Th align="right">Events 7d</Th>
                  <Th align="right">Total events</Th>
                  <Th align="right">Last activity</Th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.user_id}
                    style={{
                      borderBottom: "1px solid #161616",
                      verticalAlign: "top",
                    }}
                  >
                    <Td>
                      <div style={{ fontWeight: 500 }}>{u.email}</div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#525252",
                          marginTop: 4,
                          fontFamily: "monospace",
                        }}
                      >
                        {u.tenant_id ? u.tenant_id.slice(0, 8) + "…" : "—"}
                        {u.tenant_name && u.tenant_name !== u.email
                          ? ` · ${u.tenant_name}`
                          : ""}
                      </div>
                      {u.api_keys.length > 0 && (
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 11,
                            color: "#737373",
                          }}
                        >
                          {u.api_keys.map((k) => (
                            <div key={k.prefix}>
                              {k.name || "Key"}:{" "}
                              <span style={{ fontFamily: "monospace" }}>
                                {k.prefix}…
                              </span>
                              {k.last_used
                                ? ` · used ${formatDistanceToNow(new Date(k.last_used), { addSuffix: true })}`
                                : ""}
                            </div>
                          ))}
                        </div>
                      )}
                    </Td>
                    <Td>{statusTag(u.customer_status)}</Td>
                    <Td subtle>
                      {u.plan ?? "—"}
                      {u.subscription_status && (
                        <div style={{ fontSize: 10, marginTop: 2 }}>
                          {u.subscription_status}
                        </div>
                      )}
                    </Td>
                    <Td subtle>
                      {u.created_at
                        ? format(new Date(u.created_at), "MMM d, yyyy")
                        : "—"}
                      {u.last_login && (
                        <div style={{ fontSize: 10, marginTop: 2 }}>
                          login{" "}
                          {formatDistanceToNow(new Date(u.last_login), {
                            addSuffix: true,
                          })}
                        </div>
                      )}
                    </Td>
                    <Td align="right" mono>
                      {fmt(u.agent_count)}
                    </Td>
                    <Td align="right" mono>
                      {u.active_keys}
                    </Td>
                    <Td align="right" mono>
                      <span
                        style={{
                          color: u.events_7d > 0 ? "#22c55e" : "#525252",
                        }}
                      >
                        {fmt(u.events_7d)}
                      </span>
                    </Td>
                    <Td align="right" mono>
                      {fmt(u.total_events)}
                    </Td>
                    <Td align="right" subtle>
                      {u.last_event
                        ? formatDistanceToNow(new Date(u.last_event), {
                            addSuffix: true,
                          })
                        : "—"}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {usage && usage.top_tenants_7d.length > 0 && (
        <Card title="Top tenants by 7d activity">
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid #1f1f1f",
                  color: "#737373",
                  fontSize: 11,
                  textTransform: "uppercase",
                }}
              >
                <Th>Owner</Th>
                <Th>Tenant</Th>
                <Th align="right">Events 7d</Th>
              </tr>
            </thead>
            <tbody>
              {usage.top_tenants_7d.map((t) => (
                <tr
                  key={t.tenant_id}
                  style={{ borderBottom: "1px solid #161616" }}
                >
                  <Td>{t.owner ?? "—"}</Td>
                  <Td subtle>{t.name ?? t.tenant_id.slice(0, 8) + "…"}</Td>
                  <Td align="right" mono>
                    {fmt(t.events_7d)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ── Demo requests ────────────────────────────────────────────────────────────

function DemoRequestsSection({ token }: { token: string }) {
  const [rows, setRows] = useState<DemoRequest[] | null>(null);
  const [search, setSearch] = useState("");

  const load = () => {
    adminDemoRequests(token, { search, limit: 200 })
      .then(setRows)
      .catch(() => setRows([]));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        <Stat
          label="Total requests"
          value={fmt(rows?.length)}
          sub="from contact forms"
          accent="#7c3aed"
        />
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Search name, email, company, website, role, source…"
          style={{
            flex: "1 1 220px",
            padding: "8px 12px",
            background: "#0a0a0a",
            border: "1px solid #2a2a2a",
            borderRadius: 8,
            color: "#fff",
            fontSize: 13,
          }}
        />
        <button type="button" onClick={load} style={btnSmall()}>
          Refresh
        </button>
      </div>

      <Card
        title="Demo requests"
        subtitle="Submissions from Let's connect and contact forms. Newest first."
      >
        {!rows ? (
          <SkeletonBlock />
        ) : rows.length === 0 ? (
          <Empty>No demo requests yet.</Empty>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
                minWidth: 920,
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid #1f1f1f",
                    color: "#737373",
                    fontSize: 11,
                    textTransform: "uppercase",
                  }}
                >
                  <Th>First name</Th>
                  <Th>Last name</Th>
                  <Th>Email</Th>
                  <Th>Company</Th>
                  <Th>Role</Th>
                  <Th>Source</Th>
                  <Th>Website</Th>
                  <Th align="right">Submitted</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.request_id}
                    style={{ borderBottom: "1px solid #161616" }}
                  >
                    <Td>{r.first_name}</Td>
                    <Td>{r.last_name}</Td>
                    <Td mono>{r.email}</Td>
                    <Td>{r.company_name}</Td>
                    <Td subtle>{r.position || "—"}</Td>
                    <Td subtle>{r.source || "—"}</Td>
                    <Td>
                      <a
                        href={
                          r.website.startsWith("http")
                            ? r.website
                            : `https://${r.website}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#a78bfa", textDecoration: "none" }}
                      >
                        {r.website}
                      </a>
                    </Td>
                    <Td align="right" subtle>
                      {r.created_at
                        ? formatDistanceToNow(new Date(r.created_at), {
                            addSuffix: true,
                          })
                        : "—"}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function MarketingSubscriptionsSection({ token }: { token: string }) {
  const [rows, setRows] = useState<MarketingSubscription[] | null>(null)
  const [search, setSearch] = useState('')

  const load = () => {
    adminMarketingSubscriptions(token, { search, limit: 300 }).then(setRows).catch(() => setRows([]))
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 10_000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <Stat label="Total subscriptions" value={fmt(rows?.length)} sub="email captures" accent="#22c55e" />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="Search email…"
          style={{
            flex: '1 1 220px', padding: '8px 12px', background: '#0a0a0a',
            border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: 13,
          }}
        />
        <button type="button" onClick={load} style={btnSmall()}>Refresh</button>
      </div>

      <Card title="Marketing Material Subscriptions" subtitle="Emails submitted from the marketing popup. Newest first.">
        {!rows ? <SkeletonBlock /> : rows.length === 0 ? (
          <Empty>No subscriptions yet.</Empty>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 860 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1f1f1f', color: '#737373', fontSize: 11, textTransform: 'uppercase' }}>
                  <Th>Email</Th>
                  <Th>Source</Th>
                  <Th>IP</Th>
                  <Th align="right">Submitted</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.subscription_id} style={{ borderBottom: '1px solid #161616' }}>
                    <Td mono>{r.email}</Td>
                    <Td subtle>{r.source || '—'}</Td>
                    <Td subtle mono>{r.ip_address || '—'}</Td>
                    <Td align="right" subtle>
                      {r.created_at ? formatDistanceToNow(new Date(r.created_at), { addSuffix: true }) : '—'}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}


// ── Reusable bits ────────────────────────────────────────────────────────────

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#111",
        border: "1px solid #1f1f1f",
        borderRadius: 14,
        padding: "20px 22px",
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#fff",
            marginBottom: 4,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 12, color: "#737373", lineHeight: 1.5 }}>
            {subtitle}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function DistBlock({
  title,
  rows,
  accent,
}: {
  title: string;
  rows: { k: string; n: number }[];
  accent: string;
}) {
  const total = rows.reduce((s, r) => s + r.n, 0) || 1;
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: "#737373",
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {rows.length === 0 ? (
        <div style={{ fontSize: 12, color: "#525252" }}>—</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((r) => {
            const pct = (r.n / total) * 100;
            return (
              <div key={r.k}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: "#d4d4d4",
                      fontFamily: "monospace",
                    }}
                  >
                    {r.k || "—"}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: "#737373",
                      fontFamily: "monospace",
                    }}
                  >
                    {fmt(r.n)}
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    background: "#0a0a0a",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: accent,
                      opacity: 0.7,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DailyBars({
  data,
  accent,
}: {
  data: { day: string; value: number }[];
  accent: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div
      style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 96 }}
    >
      {data.map((d) => {
        const h = Math.max(2, (d.value / max) * 92);
        return (
          <div
            key={d.day}
            title={`${d.day}: ${fmt(d.value)}`}
            style={{
              flex: 1,
              minWidth: 4,
              height: h,
              background: accent,
              borderRadius: 2,
              opacity: 0.7,
              transition: "opacity 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseOut={(e) => (e.currentTarget.style.opacity = "0.7")}
          />
        );
      })}
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      style={{
        padding: "10px 12px",
        textAlign: align,
        fontWeight: 600,
        letterSpacing: 0.8,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  mono = false,
  subtle = false,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  mono?: boolean;
  subtle?: boolean;
}) {
  return (
    <td
      style={{
        padding: "10px 12px",
        textAlign: align,
        fontFamily: mono ? "JetBrains Mono, monospace" : undefined,
        color: subtle ? "#737373" : "#d4d4d4",
      }}
    >
      {children}
    </td>
  );
}

function Tag({
  children,
  color,
}: {
  children: React.ReactNode;
  color: string;
}) {
  return (
    <span
      style={{
        fontSize: 11,
        padding: "2px 8px",
        borderRadius: 4,
        background: `${color}20`,
        color,
        fontWeight: 500,
      }}
    >
      {children}
    </span>
  );
}

function SkeletonBlock() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            height: 18,
            background: "#161616",
            borderRadius: 4,
            opacity: 0.5 - i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "32px",
        textAlign: "center",
        color: "#525252",
        fontSize: 13,
      }}
    >
      {children}
    </div>
  );
}

function fmt(n: number | undefined | null): string {
  if (n === undefined || n === null) return "—";
  return n.toLocaleString();
}
