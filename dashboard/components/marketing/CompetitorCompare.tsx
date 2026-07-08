import Link from "next/link";
import { BRAND } from "@/components/brand";
import { M, container, h2, lead, sectionTitle } from "./marketing-theme";
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

export function CompetitorCompare() {
  return (
    <section
      id="compare"
      className="zdb-section"
      style={{ padding: "88px 40px", background: "#fff" }}
    >
      <div style={container(980)}>
        <p style={sectionTitle}>Compare</p>
        <h2 style={h2}>Operational database vs traces, memory, and vectors</h2>
        <p style={lead}>
          Vector DBs store embeddings. Traces show spans. ZizkaDB stores agent
          decisions, lineage, and drift.
        </p>

        <div
          style={{
            overflowX: "auto",
            marginBottom: 28,
            borderRadius: 16,
            border: `1px solid ${M.line}`,
          }}
        >
          <table
            style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}
          >
            <thead>
              <tr style={{ background: M.wash }}>
                {COLS.map((col, i) => (
                  <th
                    key={col}
                    style={{
                      padding: "14px 16px",
                      textAlign: i === 0 ? "left" : "center",
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#000",
                      borderBottom: `2px solid ${M.line}`,
                      background: i === 4 ? "#fff7ed" : M.wash,
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
                      color: "#000",
                      borderBottom: `1px solid ${M.line}`,
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
                        color:
                          v === "✓" ? "#16a34a" : v === "~" ? BRAND : "#000",
                        borderBottom: `1px solid ${M.line}`,
                        background: j === 3 ? "#fff7ed" : "#fff",
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

        <p
          style={{
            textAlign: "center",
            fontSize: 13,
            fontWeight: 600,
            color: "#000",
            margin: "0 0 20px",
          }}
        >
          ~ = partial support. Verify competitor docs before external debates.
        </p>

        <div
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
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 28px",
              borderRadius: 12,
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 15,
              color: "#fff",
              background: "#000",
              border: "2px solid #000",
            }}
          >
            View on GitHub →
          </a>
          <Link
            href="/trust#comparison"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 28px",
              borderRadius: 12,
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 15,
              color: "#000",
              background: "#fff",
              border: `2px solid #000`,
            }}
          >
            Full comparison
          </Link>
        </div>
      </div>
    </section>
  );
}
