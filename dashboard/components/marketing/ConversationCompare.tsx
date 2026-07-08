import { BRAND, BRAND_SHADOW_TINT } from "@/components/brand";
import { M, container, h2, lead } from "./marketing-theme";

export function ConversationCompare() {
  return (
    <section
      id="demo"
      className="zdb-section"
      style={{ padding: "88px 40px", background: "#fff" }}
    >
      <div style={container(980)}>
        <h2 style={h2}>See what changes when you can replay any session</h2>
        <p style={lead}>
          Same incident. Without ZizkaDB you guess. With it you see the exact
          decision trail.
        </p>

        <div
          className="zdb-compare-grid"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}
        >
          <ComparePanel
            title="Without ZizkaDB"
            subtitle="Your team today"
            muted
            messages={[
              {
                role: "Customer",
                text: "Your bot told me refunds take 30 days. That is wrong.",
              },
              {
                role: "Your team",
                text: "Can you send a screenshot? We will check the logs.",
              },
              {
                role: "Engineering",
                text: "Logs show nothing useful. Maybe a prompt issue?",
              },
            ]}
            footer="Hours lost. Still no root cause."
          />
          <ComparePanel
            title="With ZizkaDB"
            subtitle="Same incident, 2 minutes later"
            highlight
            messages={[
              {
                role: "Drift alert",
                text: "Refund answers changed after prompt v2 deploy.",
              },
              {
                role: "Replay",
                text: "Agent skipped policy doc, used outdated FAQ chunk.",
              },
              {
                role: "Fix",
                text: "Roll back prompt. Confirm baseline restored.",
              },
            ]}
            footer="Root cause found. Prompt rolled back."
          />
        </div>
      </div>
    </section>
  );
}

function ComparePanel({
  title,
  subtitle,
  messages,
  footer,
  muted,
  highlight,
}: {
  title: string;
  subtitle: string;
  messages: { role: string; text: string }[];
  footer: string;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        borderRadius: 20,
        overflow: "hidden",
        border: highlight ? `2px solid ${BRAND}` : `1px solid ${M.line}`,
        boxShadow: highlight
          ? `0 16px 48px ${BRAND_SHADOW_TINT}`
          : "0 4px 20px rgba(15,23,42,0.04)",
      }}
    >
      <div
        style={{
          padding: "18px 20px",
          background: highlight
            ? "linear-gradient(135deg, #fff7ed, #eff6ff)"
            : M.wash,
          borderBottom: `1px solid ${M.line}`,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 0.6,
            color: "#000",
            marginBottom: 4,
          }}
        >
          {title.toUpperCase()}
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#000" }}>
          {subtitle}
        </div>
      </div>
      <div
        style={{
          padding: "18px 20px",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              background: muted
                ? M.wash
                : highlight && i === 0
                  ? "#fff7ed"
                  : M.bluePale,
              border: `1px solid ${M.line}`,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "#000",
                marginBottom: 4,
              }}
            >
              {m.role}
            </div>
            <div style={{ fontSize: 13, color: "#000", lineHeight: 1.5 }}>
              {m.text}
            </div>
          </div>
        ))}
        <div
          style={{
            marginTop: 4,
            fontSize: 13,
            fontWeight: 700,
            lineHeight: 1.5,
            color: "#000",
            padding: "12px 14px",
            borderRadius: 12,
            background: muted ? M.wash : "#ecfdf5",
            border: `1px solid ${M.line}`,
          }}
        >
          {footer}
        </div>
      </div>
    </div>
  );
}
