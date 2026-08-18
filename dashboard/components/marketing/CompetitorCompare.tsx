import Link from "next/link";
import { BRAND } from "@/components/brand";
import { M, container, h2, lead, sectionTitle, secondaryBtn, outlineBtn } from "./marketing-theme";
import { GITHUB_URL } from "@/lib/constants";

const ROWS: [string, string, string, string, string][] = [
  ["Agent event logging", "✓", "✗", "✗", "✓"],
  ["Causal lineage", "~", "✗", "✗", "✓"],
  ["Time travel (state at T)", "✗", "✗", "✗", "✓"],
  ["Semantic search on history", "✗", "✓", "✓", "✓"],
  ["Behavioral baseline / drift", "✗", "✗", "✗", "✓"],
  ["Cross-agent fleet queries", "✗", "✗", "✗", "✓"],
  ["Self-host free", "✓", "✓", "✗", "✓"],
];

const COLS = [
  "Capability",
  "LangSmith",
  "Mem0",
  "Pinecone",
  "ZizkaDB",
] as const;

const MOBILE_COMPETITORS = ["LangSmith", "Mem0", "Pinecone", "ZizkaDB"] as const;

function cellColor(v: string) {
  return v === "✓" ? M.success : v === "~" ? BRAND : M.muted;
}

export function CompetitorCompare() {
  return (
    <section
      id="compare"
      className="zdb-section"
      style={{ padding: "88px 40px", background: M.bg }}
    >
      <div style={container(980)}>
        <p style={sectionTitle}>Compare</p>
        <h2 className="zdb-section-h2" style={h2}>
          Operational database vs traces, memory, and vectors
        </h2>
        <p className="zdb-lead" style={lead}>
          Vector DBs store embeddings. Traces show spans. ZizkaDB stores agent
          decisions, lineage, and drift.
        </p>

        <div
          className="zdb-compare-table-wrap"
          style={{
            overflowX: "auto",
            marginBottom: 28,
            borderRadius: 16,
            border: `1px solid ${M.line}`,
            WebkitOverflowScrolling: "touch",
          }}
        >
          <table
            style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}
          >
            <thead>
              <tr style={{ background: M.surface }}>
                {COLS.map((col, i) => (
                  <th
                    key={col}
                    style={{
                      padding: "14px 16px",
                      textAlign: i === 0 ? "left" : "center",
                      fontSize: 13,
                      fontWeight: 800,
                      color: M.inkSoft,
                      borderBottom: `2px solid ${M.line}`,
                      background: i === 4 ? "rgba(249,115,22,0.12)" : M.surface,
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([cap, ...vals]) => (
                <tr key={cap}>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      color: M.inkSoft,
                      borderBottom: `1px solid ${M.line}`,
                      background: M.bgElevated,
                    }}
                  >
                    {cap}
                  </td>
                  {vals.map((v, j) => (
                    <td
                      key={j}
                      style={{
                        padding: "12px 16px",
                        textAlign: "center",
                        fontSize: 15,
                        fontWeight: 800,
                        color: cellColor(v),
                        borderBottom: `1px solid ${M.line}`,
                        background: j === 3 ? "rgba(249,115,22,0.08)" : M.bgElevated,
                      }}
                    >
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          className="zdb-compare-mobile"
          style={{
            flexDirection: "column",
            gap: 12,
            marginBottom: 28,
          }}
        >
          {ROWS.map(([cap, ...vals]) => (
            <div
              key={cap}
              style={{
                borderRadius: 14,
                border: `1px solid ${M.line}`,
                background: M.bgElevated,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  fontSize: 14,
                  fontWeight: 700,
                  color: M.ink,
                  borderBottom: `1px solid ${M.line}`,
                  background: M.surface,
                }}
              >
                {cap}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 1,
                  background: M.line,
                }}
              >
                {vals.map((v, j) => (
                  <div
                    key={MOBILE_COMPETITORS[j]}
                    style={{
                      padding: "10px 12px",
                      background: j === 3 ? "rgba(249,115,22,0.08)" : M.bgElevated,
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 700, color: M.faint, marginBottom: 4 }}>
                      {MOBILE_COMPETITORS[j]}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: cellColor(v) }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: 13,
            fontWeight: 600,
            color: M.muted,
            margin: "0 0 20px",
          }}
        >
          ~ = partial support. Verify competitor docs before external debates.
        </p>

        <div
          className="zdb-cta-row"
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            style={{ ...secondaryBtn, fontWeight: 700 }}
          >
            View on GitHub →
          </a>
          <Link href="/trust#comparison" style={{ ...outlineBtn, fontWeight: 700 }}>
            Full comparison
          </Link>
        </div>
      </div>
    </section>
  );
}
