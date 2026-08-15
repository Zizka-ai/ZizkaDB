import { M } from "./marketing-theme";

const TRUST_ITEMS = [
  {
    icon: "📦",
    title: "Open source",
    body: "AGPL license. Inspect, fork, self-host free.",
  },
  {
    icon: "🏠",
    title: "Self-host free",
    body: "Docker Compose on your own infrastructure.",
  },
  {
    icon: "🔒",
    title: "Checksum-backed events",
    body: "Tamper-evident decision history.",
  },
  {
    icon: "🇪🇺",
    title: "Managed cloud",
    body: "db.zizka.ai when you want zero ops.",
  },
];

export function TrustBar() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${TRUST_ITEMS.length}, 1fr)`,
        gap: 16,
      }}
      className="zdb-trust-grid"
    >
      {TRUST_ITEMS.map((item) => (
        <div
          key={item.title}
          style={{
            padding: "20px 18px",
            borderRadius: 16,
            background: "#fff",
            border: `1px solid ${M.line}`,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 10 }}>{item.icon}</div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#000",
              marginBottom: 6,
            }}
          >
            {item.title}
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "#000",
              lineHeight: 1.5,
            }}
          >
            {item.body}
          </div>
        </div>
      ))}
    </div>
  );
}
