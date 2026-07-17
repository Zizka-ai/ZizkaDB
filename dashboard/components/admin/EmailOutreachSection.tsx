"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  adminOutreachPreview,
  adminOutreachSend,
  adminOutreachSends,
  adminOutreachStats,
  type OutreachSend,
  type OutreachStats,
} from "@/lib/api";

const DEFAULT_BODY = `Since you're an Agentic AI developer, we have a gift for you! ZizkaDB is now in production.

Almost 2,000 developers are already using it. We've made a pledge to keep it open source so every developer can benefit from it.

ZizkaDB is a go-to tool for AI agent auditing. You can prevent agent mistakes before they happen on the client side, measure agent behavior, and debug your agents in production—all in minutes.

The best part? It's open source, and we're actively accepting valuable PRs. So you can also play a part in making it even better.

Go ahead, give us a ⭐ on GitHub, and if you like the product, let us know by replying to this email or submitting a cool PR.

Looking forward to hearing how you've integrated ZizkaDB into your stack.`;

const DEFAULT_IMAGE =
  typeof window !== "undefined"
    ? `${window.location.origin}/outreach/dashboard-preview.png`
    : "https://db.zizka.ai/outreach/dashboard-preview.png";

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

export function EmailOutreachSection({ token }: { token: string }) {
  const [stats, setStats] = useState<OutreachStats | null>(null);
  const [sends, setSends] = useState<OutreachSend[] | null>(null);
  const [toEmail, setToEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [subject, setSubject] = useState("Try ZizkaDB in 60 Seconds!");
  const [body, setBody] = useState(DEFAULT_BODY);
  const [imageUrl, setImageUrl] = useState(DEFAULT_IMAGE);
  const [imageCaption, setImageCaption] = useState(
    "Explore sessions, behavior drift, and causal replay in the live dashboard.",
  );
  const [ctaLabel, setCtaLabel] = useState("Star on GitHub");
  const [ctaUrl, setCtaUrl] = useState("https://github.com/Zizka-ai/ZizkaDB");
  const [discordCtaLabel, setDiscordCtaLabel] = useState("Join our Discord community");
  const [discordCtaUrl, setDiscordCtaUrl] = useState("https://discord.gg/EBjAABKkh");
  const [githubUrl, setGithubUrl] = useState("https://github.com/Zizka-ai/ZizkaDB");
  const [signOff, setSignOff] = useState("Best,\nFellow Developer,\nMir");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(() => {
    adminOutreachStats(token)
      .then(setStats)
      .catch(() => setStats(null));
    adminOutreachSends(token, 50)
      .then(setSends)
      .catch(() => setSends([]));
  }, [token]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15_000);
    return () => clearInterval(id);
  }, [refresh]);

  const payload = () => ({
    to_email: toEmail.trim(),
    subject: subject.trim(),
    recipient_name: recipientName.trim(),
    body,
    image_url: imageUrl.trim() || undefined,
    image_caption: imageCaption.trim() || undefined,
    cta_label: ctaLabel.trim() || undefined,
    cta_url: ctaUrl.trim() || undefined,
    discord_cta_label: discordCtaLabel.trim() || undefined,
    discord_cta_url: discordCtaUrl.trim() || undefined,
    github_url: githubUrl.trim() || "https://github.com/Zizka-ai/ZizkaDB",
    sign_off: signOff,
  });

  const onPreview = async () => {
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const res = await adminOutreachPreview(token, {
        recipient_name: recipientName.trim(),
        body,
        image_url: imageUrl.trim() || undefined,
        image_caption: imageCaption.trim() || undefined,
        cta_label: ctaLabel.trim() || undefined,
        cta_url: ctaUrl.trim() || undefined,
        discord_cta_label: discordCtaLabel.trim() || undefined,
        discord_cta_url: discordCtaUrl.trim() || undefined,
        github_url: githubUrl.trim() || "https://github.com/Zizka-ai/ZizkaDB",
        sign_off: signOff,
      });
      setPreviewHtml(res.html);
      setMsg("Preview updated.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setBusy(false);
    }
  };

  const onSend = async () => {
    setErr(null);
    setMsg(null);
    if (!toEmail.trim()) {
      setErr("Recipient email is required.");
      return;
    }
    if (!window.confirm(`Send outreach email to ${toEmail.trim()}?`)) return;
    setBusy(true);
    try {
      const res = await adminOutreachSend(token, payload());
      setMsg(
        res.dev_fallback
          ? `Dev fallback: email printed to API logs (SMTP not configured). Remaining today: ${res.remaining_today}.`
          : `Sent to ${res.to_email}. Remaining today: ${res.remaining_today}.`,
      );
      refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Send failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        <MiniStat
          label="Sent today"
          value={`${fmt(stats?.sent_today)} / ${fmt(stats?.daily_limit)}`}
          sub={`${fmt(stats?.remaining_today)} remaining`}
          accent="#22c55e"
        />
        <MiniStat label="Total sent" value={fmt(stats?.total_sent)} sub="all time" />
        <MiniStat
          label="Opened"
          value={fmt(stats?.total_opened)}
          sub="unique first opens"
          accent="#38bdf8"
        />
        <MiniStat
          label="Open rate"
          value={stats ? `${stats.open_rate_pct}%` : "—"}
          sub="directional (pixel)"
          accent="#f97316"
        />
        <MiniStat
          label="From"
          value={stats?.smtp_configured ? "SMTP ready" : "Dev fallback"}
          sub={stats?.from_address || "founder@zizka.ai"}
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
          display: "grid",
          gridTemplateColumns: "1.05fr 0.95fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div
          style={{
            background: "#111",
            border: "1px solid #1f1f1f",
            borderRadius: 14,
            padding: "20px 22px",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 4 }}>
            Compose outreach
          </div>
          <div style={{ fontSize: 12, color: "#737373", marginBottom: 18 }}>
            Edit subject, body, screenshot URL, and CTA. Sends from your configured SMTP (
            founder@zizka.ai). Max {stats?.daily_limit ?? 100}/day.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="To email *">
              <input
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="federico@example.com"
                style={inputStyle}
              />
            </Field>
            <Field label="Recipient name">
              <input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Federico"
                style={inputStyle}
              />
            </Field>
          </div>

          <div style={{ marginTop: 12 }}>
            <Field label="Subject *">
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          <div style={{ marginTop: 12 }}>
            <Field label="Body (blank line = new paragraph)">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
              />
            </Field>
          </div>

          <div style={{ marginTop: 12 }}>
            <Field label="Screenshot image URL">
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://db.zizka.ai/outreach/dashboard-preview.png"
                style={inputStyle}
              />
            </Field>
          </div>

          <div style={{ marginTop: 12 }}>
            <Field label="Image caption">
              <input
                value={imageCaption}
                onChange={(e) => setImageCaption(e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <Field label="CTA label">
              <input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="CTA URL">
              <input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} style={inputStyle} />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <Field label="Discord CTA label">
              <input
                value={discordCtaLabel}
                onChange={(e) => setDiscordCtaLabel(e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="Discord CTA URL">
              <input
                value={discordCtaUrl}
                onChange={(e) => setDiscordCtaUrl(e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          <div style={{ marginTop: 12 }}>
            <Field label="GitHub URL">
              <input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} style={inputStyle} />
            </Field>
          </div>

          <div style={{ marginTop: 12 }}>
            <Field label="Sign-off">
              <textarea
                value={signOff}
                onChange={(e) => setSignOff(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
              />
            </Field>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button type="button" onClick={onPreview} disabled={busy} style={btnStyle(false)}>
              Preview
            </button>
            <button type="button" onClick={onSend} disabled={busy} style={btnStyle(true)}>
              {busy ? "Working…" : "Send email"}
            </button>
          </div>
        </div>

        <div
          style={{
            background: "#111",
            border: "1px solid #1f1f1f",
            borderRadius: 14,
            padding: "20px 22px",
            minHeight: 420,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 4 }}>
            Live preview
          </div>
          <div style={{ fontSize: 12, color: "#737373", marginBottom: 14 }}>
            Approximate inbox render. Click Preview to refresh.
          </div>
          {previewHtml ? (
            <iframe
              title="Email preview"
              srcDoc={previewHtml}
              style={{
                width: "100%",
                height: 560,
                border: "1px solid #2a2a2a",
                borderRadius: 10,
                background: "#fff",
              }}
            />
          ) : (
            <div
              style={{
                height: 560,
                border: "1px dashed #2a2a2a",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#525252",
                fontSize: 13,
              }}
            >
              Click Preview to render the designed email
            </div>
          )}
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>Send history</div>
            <div style={{ fontSize: 12, color: "#737373", marginTop: 2 }}>
              Opens are tracked via a hidden pixel. Apple Mail may inflate open counts.
            </div>
          </div>
          <button type="button" onClick={refresh} style={btnStyle(false)}>
            Refresh
          </button>
        </div>

        {!sends ? (
          <div style={{ color: "#525252", fontSize: 13 }}>Loading…</div>
        ) : sends.length === 0 ? (
          <div style={{ color: "#525252", fontSize: 13 }}>No outreach emails sent yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 }}>
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid #1f1f1f",
                    color: "#737373",
                    fontSize: 11,
                    textTransform: "uppercase",
                  }}
                >
                  <th style={th}>To</th>
                  <th style={th}>Subject</th>
                  <th style={th}>Status</th>
                  <th style={th}>Opens</th>
                  <th style={{ ...th, textAlign: "right" }}>Sent</th>
                </tr>
              </thead>
              <tbody>
                {sends.map((s) => (
                  <tr key={s.send_id} style={{ borderBottom: "1px solid #161616" }}>
                    <td style={tdMono}>{s.to_email}</td>
                    <td style={td}>{s.subject}</td>
                    <td style={td}>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 4,
                          background:
                            s.status === "sent"
                              ? "#22c55e20"
                              : s.status === "failed"
                                ? "#ef444420"
                                : "#73737320",
                          color:
                            s.status === "sent"
                              ? "#22c55e"
                              : s.status === "failed"
                                ? "#f87171"
                                : "#a3a3a3",
                        }}
                      >
                        {s.status}
                      </span>
                      {s.error ? (
                        <div style={{ fontSize: 11, color: "#f87171", marginTop: 4 }}>{s.error}</div>
                      ) : null}
                    </td>
                    <td style={tdMono}>
                      {s.open_count > 0 ? (
                        <>
                          {s.open_count}
                          {s.opened_at ? (
                            <div style={{ fontSize: 11, color: "#737373" }}>
                              first {formatDistanceToNow(new Date(s.opened_at), { addSuffix: true })}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={{ ...td, textAlign: "right", color: "#737373" }}>
                      {s.sent_at
                        ? formatDistanceToNow(new Date(s.sent_at), { addSuffix: true })
                        : s.created_at
                          ? formatDistanceToNow(new Date(s.created_at), { addSuffix: true })
                          : "—"}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
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
      <div style={{ fontSize: 11, color: "#525252", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis" }}>
        {sub}
      </div>
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
};

const tdMono: React.CSSProperties = {
  ...td,
  fontFamily: "JetBrains Mono, monospace",
};
