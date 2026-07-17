"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  adminLeadsCountries,
  adminLeadsFind,
  adminLeadsList,
  adminLeadsStats,
  adminLeadsUpdateStatus,
  type DeveloperLead,
  type LeadsStats,
} from "@/lib/api";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "#0a0a0a",
  border: "1px solid #2a2a2a",
  borderRadius: 8,
  color: "#fff",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  color: "#737373",
  textTransform: "uppercase",
  letterSpacing: 0.8,
  marginBottom: 6,
};

function fmt(n?: number | null) {
  if (n == null) return "—";
  return n.toLocaleString();
}

export function DeveloperLeadsSection({
  token,
  onOpenOutreach,
}: {
  token: string;
  onOpenOutreach?: (email: string, name?: string | null) => void;
}) {
  const [stats, setStats] = useState<LeadsStats | null>(null);
  const [leads, setLeads] = useState<DeveloperLead[] | null>(null);
  const [countries, setCountries] = useState<{ code: string; name: string }[]>([]);
  const [keywords, setKeywords] = useState(
    "agent,agents,mcp,langchain,crewai,llm",
  );
  const [countryCode, setCountryCode] = useState("WW");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(() => {
    adminLeadsStats(token)
      .then((s) => {
        setStats(s);
        setKeywords((prev) => (prev ? prev : s.default_keywords));
      })
      .catch(() => setStats(null));
    adminLeadsList(token, {
      status: statusFilter || undefined,
      search: search || undefined,
      limit: 200,
    })
      .then(setLeads)
      .catch(() => setLeads([]));
  }, [token, statusFilter, search]);

  useEffect(() => {
    adminLeadsCountries(token)
      .then(setCountries)
      .catch(() => setCountries([{ code: "WW", name: "Worldwide" }]));
  }, [token]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 20_000);
    return () => clearInterval(id);
  }, [refresh]);

  const onFind = async () => {
    setErr(null);
    setMsg(null);
    if (!window.confirm(
      `Find up to ${stats?.remaining_today ?? 100} public GitHub emails for today?\n\nKeywords: ${keywords}\nCountry: ${countryCode}`,
    )) {
      return;
    }
    setBusy(true);
    try {
      const res = await adminLeadsFind(token, {
        keywords,
        country_code: countryCode,
      });
      setMsg(
        `Found ${res.found} candidates, imported ${res.inserted} new leads. Remaining today: ${res.remaining_today}.`,
      );
      refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Find failed");
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (leadId: string, status: string) => {
    try {
      await adminLeadsUpdateStatus(token, leadId, status);
      refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Update failed");
    }
  };

  const openInOutreach = (lead: DeveloperLead) => {
    try {
      sessionStorage.setItem(
        "outreach_prefill",
        JSON.stringify({
          email: lead.email,
          name: lead.name || lead.github_username || "",
        }),
      );
    } catch {
      /* ignore */
    }
    void setStatus(lead.lead_id, "approved");
    onOpenOutreach?.(lead.email, lead.name || lead.github_username);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        <MiniStat
          label="Imported today"
          value={`${fmt(stats?.imported_today)} / ${fmt(stats?.daily_limit)}`}
          sub={`${fmt(stats?.remaining_today)} remaining`}
          accent="#22c55e"
        />
        <MiniStat label="Total leads" value={fmt(stats?.total)} sub="all time" />
        <MiniStat label="New" value={fmt(stats?.status_new)} sub="awaiting review" accent="#38bdf8" />
        <MiniStat label="Approved" value={fmt(stats?.approved)} sub="ready to email" />
        <MiniStat
          label="GitHub token"
          value={stats?.token_configured ? "Configured" : "Missing"}
          sub="GITHUB_LEADS_TOKEN"
          accent={stats?.token_configured ? "#22c55e" : "#f87171"}
        />
      </div>

      {(err || msg) && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 13,
            background: err ? "#1a0000" : "#052e16",
            border: `1px solid ${err ? "#ef444440" : "#22c55e40"}`,
            color: err ? "#f87171" : "#86efac",
          }}
        >
          {err || msg}
        </div>
      )}

      <div
        style={{
          background: "#111",
          border: "1px solid #1f1f1f",
          borderRadius: 14,
          padding: "20px 22px",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 4 }}>
          Find today&apos;s leads
        </div>
        <div style={{ fontSize: 12, color: "#737373", marginBottom: 16 }}>
          Manual only. Finds developers who starred or contributed to keyword repos and have a{" "}
          <strong style={{ color: "#a3a3a3" }}>public</strong> GitHub email. Dedupes past leads +
          outreach. Cap {stats?.daily_limit ?? 100}/day.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr auto", gap: 12, alignItems: "end" }}>
          <label style={{ display: "block" }}>
            <span style={labelStyle}>Keywords</span>
            <input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              style={inputStyle}
              placeholder="agent,agents,mcp,langchain,crewai,llm"
            />
          </label>
          <label style={{ display: "block" }}>
            <span style={labelStyle}>Country</span>
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              style={{ ...inputStyle, appearance: "auto" as const }}
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={onFind} disabled={busy} style={btnStyle(true)}>
            {busy ? "Searching GitHub…" : "Find today's leads"}
          </button>
        </div>
      </div>

      <div
        style={{
          background: "#111",
          border: "1px solid #1f1f1f",
          borderRadius: 14,
          padding: "20px 22px",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14, alignItems: "center" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && refresh()}
            placeholder="Search email, user, location…"
            style={{ ...inputStyle, flex: "1 1 220px" }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ ...inputStyle, width: 160, appearance: "auto" as const }}
          >
            <option value="">All statuses</option>
            <option value="new">New</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="contacted">Contacted</option>
          </select>
          <button type="button" onClick={refresh} style={btnStyle(false)}>
            Refresh
          </button>
        </div>

        {!leads ? (
          <div style={{ color: "#525252", fontSize: 13 }}>Loading…</div>
        ) : leads.length === 0 ? (
          <div style={{ color: "#525252", fontSize: 13 }}>
            No leads yet. Run Find today&apos;s leads.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 980 }}>
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid #1f1f1f",
                    color: "#737373",
                    fontSize: 11,
                    textTransform: "uppercase",
                  }}
                >
                  <th style={th}>Email</th>
                  <th style={th}>GitHub</th>
                  <th style={th}>Location</th>
                  <th style={th}>Match</th>
                  <th style={th}>Status</th>
                  <th style={{ ...th, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.lead_id} style={{ borderBottom: "1px solid #161616" }}>
                    <td style={tdMono}>
                      {l.email}
                      {l.name ? (
                        <div style={{ fontSize: 11, color: "#737373" }}>{l.name}</div>
                      ) : null}
                    </td>
                    <td style={td}>
                      <a
                        href={l.profile_url || `https://github.com/${l.github_username}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#86efac" }}
                      >
                        @{l.github_username}
                      </a>
                      <div style={{ fontSize: 11, color: "#525252" }}>
                        {l.created_at
                          ? formatDistanceToNow(new Date(l.created_at), { addSuffix: true })
                          : ""}
                      </div>
                    </td>
                    <td style={{ ...td, color: "#a3a3a3" }}>{l.location || "—"}</td>
                    <td style={td}>
                      <span style={{ color: "#d4d4d4" }}>{l.signal}</span>
                      <div style={{ fontSize: 11, color: "#737373", maxWidth: 220 }}>
                        {l.match_reason || l.matched_repo || l.matched_keyword}
                      </div>
                    </td>
                    <td style={td}>
                      <StatusTag status={l.status} />
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <button type="button" style={btnTiny()} onClick={() => openInOutreach(l)}>
                          Use in Outreach
                        </button>
                        {l.status !== "approved" && (
                          <button type="button" style={btnTiny()} onClick={() => setStatus(l.lead_id, "approved")}>
                            Approve
                          </button>
                        )}
                        {l.status !== "rejected" && (
                          <button type="button" style={btnTiny()} onClick={() => setStatus(l.lead_id, "rejected")}>
                            Reject
                          </button>
                        )}
                        {l.status !== "contacted" && (
                          <button type="button" style={btnTiny()} onClick={() => setStatus(l.lead_id, "contacted")}>
                            Mark contacted
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusTag({ status }: { status: string }) {
  const color =
    status === "approved"
      ? "#22c55e"
      : status === "rejected"
        ? "#f87171"
        : status === "contacted"
          ? "#38bdf8"
          : "#a3a3a3";
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
      {status}
    </span>
  );
}

function MiniStat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: "#111",
        border: "1px solid #1f1f1f",
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <div style={{ fontSize: 11, color: "#737373", textTransform: "uppercase", letterSpacing: 0.8 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: accent || "#fff", marginTop: 6 }}>{value}</div>
      <div style={{ fontSize: 11, color: "#525252", marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function btnStyle(primary: boolean): React.CSSProperties {
  return {
    padding: "10px 16px",
    borderRadius: 8,
    border: primary ? "none" : "1px solid #2a2a2a",
    background: primary ? "#22c55e" : "#0a0a0a",
    color: primary ? "#0a0a0a" : "#d4d4d4",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

function btnTiny(): React.CSSProperties {
  return {
    padding: "4px 8px",
    borderRadius: 6,
    border: "1px solid #2a2a2a",
    background: "#0a0a0a",
    color: "#d4d4d4",
    fontSize: 11,
    cursor: "pointer",
  };
}

const th: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "left",
  fontWeight: 600,
  letterSpacing: 0.8,
};

const td: React.CSSProperties = {
  padding: "10px 12px",
  color: "#d4d4d4",
  verticalAlign: "top",
};

const tdMono: React.CSSProperties = {
  ...td,
  fontFamily: "JetBrains Mono, monospace",
};
