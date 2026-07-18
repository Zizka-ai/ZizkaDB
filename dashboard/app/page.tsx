import Link from "next/link";

/**
 * Self-host product landing (OSS). Marketing site lives on managed cloud only.
 */
export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(165deg, #0a0a0a 0%, #111 45%, #0c1a12 100%)",
        color: "#f5f5f5",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        padding: "48px 24px 64px",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <p
          style={{
            fontSize: 12,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#86efac",
            marginBottom: 16,
            fontWeight: 600,
          }}
        >
          ZizkaDB · Open source
        </p>
        <h1
          style={{
            fontSize: "clamp(2rem, 5vw, 3rem)",
            lineHeight: 1.15,
            fontWeight: 700,
            margin: "0 0 16px",
            letterSpacing: "-0.02em",
          }}
        >
          Know why your agent did that.
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.6, color: "#a3a3a3", marginBottom: 32 }}>
          Causal lineage, time-travel state, and a fleet dashboard for AI agents.
          This repository is the <strong style={{ color: "#e5e5e5" }}>product runtime</strong> —
          self-host on your machine. Managed cloud marketing and operator tools are not included.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 40 }}>
          <Link
            href="/login"
            style={{
              display: "inline-block",
              background: "#22c55e",
              color: "#0a0a0a",
              fontWeight: 700,
              padding: "12px 20px",
              borderRadius: 10,
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            Open dashboard
          </Link>
          <a
            href="https://github.com/Zizka-ai/ZizkaDB"
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-block",
              border: "1px solid #333",
              color: "#e5e5e5",
              fontWeight: 600,
              padding: "12px 20px",
              borderRadius: 10,
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            GitHub
          </a>
          <a
            href="https://github.com/Zizka-ai/ZizkaDB/wiki"
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-block",
              border: "1px solid #333",
              color: "#e5e5e5",
              fontWeight: 600,
              padding: "12px 20px",
              borderRadius: 10,
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            Wiki
          </a>
        </div>

        <div
          style={{
            background: "#0a0a0a",
            border: "1px solid #1f1f1f",
            borderRadius: 14,
            padding: "20px 22px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#737373",
              marginBottom: 10,
            }}
          >
            Quickstart
          </div>
          <pre
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.55,
              color: "#86efac",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            }}
          >
            {`curl -fsSL https://raw.githubusercontent.com/Zizka-ai/ZizkaDB/main/scripts/quickstart-remote.sh | bash`}
          </pre>
          <p style={{ margin: "14px 0 0", fontSize: 13, color: "#737373", lineHeight: 1.5 }}>
            Then open{" "}
            <code style={{ color: "#a3a3a3" }}>http://localhost:3001/login</code>
          </p>
        </div>

        <p style={{ marginTop: 36, fontSize: 13, color: "#525252", lineHeight: 1.6 }}>
          Want managed cloud?{" "}
          <a href="https://db.zizka.ai" style={{ color: "#86efac" }}>
            db.zizka.ai
          </a>
          {" "}· Prefer self-host docs?{" "}
          <a
            href="https://github.com/Zizka-ai/ZizkaDB/wiki/Self-Hosting"
            style={{ color: "#86efac" }}
          >
            Self-Hosting wiki
          </a>
        </p>
      </div>
    </main>
  );
}
