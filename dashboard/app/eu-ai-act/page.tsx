import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { SiteNav } from "@/components/SiteNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { BRAND, BRAND_DARK, BRAND_PALE } from "@/components/brand";
import { FOUNDER_EMAIL } from "@/lib/constants";

export const metadata = {
  title: "EU AI Act Compliance",
  description:
    "How ZizkaDB's causal logging, traceability, and human-oversight tooling support EU AI Act (Regulation (EU) 2024/1689) conformity for providers and deployers of AI agent systems.",
};

const p: CSSProperties = {
  fontSize: 15,
  color: "#444",
  lineHeight: 1.75,
  margin: "0 0 14px",
};
const ul: CSSProperties = {
  margin: "0 0 14px",
  paddingLeft: 22,
  fontSize: 15,
  color: "#444",
  lineHeight: 1.8,
};
const h3: CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  margin: "24px 0 10px",
  color: "#222",
};
const codeInline: CSSProperties = {
  fontFamily: "monospace",
  fontSize: 12.5,
  background: "#f5f5f5",
  padding: "2px 6px",
  borderRadius: 4,
};
const link: CSSProperties = { color: "#111", fontWeight: 500 };
const table: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
  margin: "12px 0",
};
const th: CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "2px solid #eee",
  color: "#333",
  fontWeight: 600,
  fontSize: 13,
};
const td: CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid #f0f0f0",
  color: "#444",
  verticalAlign: "top",
};
const infoCard: CSSProperties = {
  padding: "20px 22px",
  borderRadius: 12,
  background: "#fafafa",
  border: "1px solid #ebebeb",
};
const techTag: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#333",
  background: "#fff",
  border: "1px solid #e5e5e5",
  borderRadius: 100,
  padding: "4px 10px",
};
const articleBadge: CSSProperties = {
  display: "inline-block",
  fontSize: 12,
  fontWeight: 700,
  color: BRAND_DARK,
  background: BRAND_PALE + "40",
  border: `1px solid ${BRAND_PALE}`,
  borderRadius: 6,
  padding: "2px 8px",
  width: "fit-content",
};
const disclaimerBox: CSSProperties = {
  padding: "16px 18px",
  borderRadius: 10,
  background: "#fffbeb",
  border: "1px solid #fde68a",
  fontSize: 13.5,
  color: "#92400e",
  lineHeight: 1.7,
  fontWeight: 500,
};
const primaryLinkBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 22px",
  background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%)`,
  color: "#fff",
  borderRadius: 10,
  textDecoration: "none",
  fontWeight: 600,
  fontSize: 14,
  boxShadow: "0 4px 18px rgba(249,115,22,0.3)",
};
const outlineLinkBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 22px",
  background: "#fff",
  color: "#111",
  borderRadius: 10,
  textDecoration: "none",
  fontWeight: 600,
  fontSize: 14,
  border: "1px solid #e5e5e5",
};

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "compliance-mapping", label: "Article mapping" },
  { id: "architecture", label: "Architecture & distribution" },
  { id: "data-protection", label: "Data protection & GDPR" },
  { id: "disclaimer", label: "Important disclaimer" },
  { id: "faq", label: "FAQ" },
  { id: "contact", label: "Contact" },
] as const;

type ComplianceRow = {
  requirement: string;
  articles: string[];
  detail: ReactNode;
};

const COMPLIANCE_ROWS: ComplianceRow[] = [
  {
    requirement: "Automatic logging & traceability",
    articles: ["Art. 12", "Art. 26(5)–(6)"],
    detail: (
      <>
        Agents log every event continuously, and sessions reconstruct
        complete timelines. Configurable, per-tenant log retention supports
        ongoing deployer monitoring on self-hosted or managed deployments.
      </>
    ),
  },
  {
    requirement: "Evidence for risk assessment & post-market monitoring",
    articles: ["Art. 12(2)", "Art. 72", "Art. 79"],
    detail: (
      <>
        Causal lineage (<code style={codeInline}>why()</code>), behavioral
        baselines, and drift signals help detect operational anomalies,
        investigate incidents, and support post-market monitoring and risk
        management processes.
      </>
    ),
  },
  {
    requirement: "Transparency for deployers",
    articles: ["Art. 13"],
    detail: (
      <>
        Dashboards, APIs, SDKs, semantic search, and point-in-time retrieval
        (<code style={codeInline}>at()</code>) make agent behavior fully
        inspectable — avoiding opaque, vendor-managed memory stores.
      </>
    ),
  },
  {
    requirement: "Human oversight",
    articles: ["Art. 14", "Art. 26"],
    detail: (
      <>
        Operators can inspect full action chains, reconstruct system state at
        any point in time, identify behavioral drift, and intervene using
        evidence rather than screenshots or manual records.
      </>
    ),
  },
  {
    requirement: "Technical documentation & conformity evidence",
    articles: ["Art. 11", "Arts. 8–9, 17"],
    detail: (
      <>
        Logged histories provide auditable evidence that supports technical
        documentation and compliance reporting. ZizkaDB complements — it does
        not replace — formal risk management or notified-body assessments.
      </>
    ),
  },
  {
    requirement: "Accuracy, robustness & cybersecurity",
    articles: ["Art. 15"],
    detail: (
      <>
        Tenant isolation, scoped API keys, tamper-evident event checksums,
        and self-hosted / VPC deployment options strengthen the security and
        operational integrity of your AI system.
      </>
    ),
  },
  {
    requirement: "Personal data management alongside the AI Act",
    articles: ["GDPR"],
    detail: (
      <>
        Operated by an EU entity with a published privacy policy,{" "}
        <code style={codeInline}>forget()</code> erasure across events and
        vectors, marketing opt-out controls, and self-hosting options to
        support data-residency requirements.
      </>
    ),
  },
];

const FAQ_ITEMS = [
  {
    q: "Does using ZizkaDB make our AI system “AI Act compliant”?",
    a: "No single tool grants full compliance. ZizkaDB provides record-keeping, traceability, and human-oversight evidence that support your broader compliance program — it doesn't replace risk classification, a quality management system, or a conformity assessment.",
  },
  {
    q: "Is ZizkaDB a substitute for a formal risk assessment?",
    a: "No. ZizkaDB supplies the operational evidence (logs, causal chains, drift signals) that a risk assessment or post-market monitoring process can draw on. The assessment itself still requires your own governance process, and for high-risk systems, qualified legal and technical review.",
  },
  {
    q: "Which AI Act obligations does ZizkaDB primarily help with?",
    a: "Mainly record-keeping (Article 12), transparency for deployers (Article 13), human oversight (Article 14), and deployer monitoring duties (Article 26). See the article mapping above for the full picture.",
  },
  {
    q: "Where is our data stored?",
    a: "It depends on your deployment: self-hosted keeps everything in your own infrastructure, managed cloud runs on infrastructure operated by ZIZKA AI S.L. (an EU entity), and Enterprise VPC deploys single-tenant inside your own cloud account.",
  },
  {
    q: "How do we exercise erasure rights under GDPR?",
    a: "Call forget() with a metadata filter, or use the dashboard. It deletes matching events and their vector embeddings together, not just the primary record.",
  },
];

export default function EuAiActPage() {
  return (
    <div
      style={{
        fontFamily: "Inter, system-ui, sans-serif",
        color: "#111",
        background: "#fff",
        minHeight: "100vh",
      }}
    >
      <SiteNav suffix="EU AI Act" />

      <div style={{ display: "flex", maxWidth: 1100, margin: "0 auto" }}>
        <aside
          style={{
            width: 220,
            flexShrink: 0,
            padding: "32px 16px",
            position: "sticky",
            top: 56,
            height: "calc(100vh - 56px)",
            overflowY: "auto",
            borderRight: "1px solid #f0f0f0",
            display: "none",
          }}
          className="ai-act-sidebar"
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#aaa",
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            On this page
          </div>
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              style={{
                display: "block",
                fontSize: 13,
                color: "#555",
                textDecoration: "none",
                padding: "6px 10px",
                borderRadius: 6,
                marginBottom: 2,
              }}
            >
              {s.label}
            </a>
          ))}
        </aside>

        <main
          style={{
            flex: 1,
            maxWidth: 820,
            padding: "48px 28px 96px",
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "inline-block",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: BRAND_DARK,
              marginBottom: 16,
              padding: "5px 14px",
              background: `${BRAND}14`,
              borderRadius: 6,
            }}
          >
            Regulation (EU) 2024/1689
          </div>
          <h1
            style={{
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: -0.6,
              margin: "0 0 12px",
              lineHeight: 1.2,
            }}
          >
            ZizkaDB supports EU AI Act compliance
          </h1>
          <p
            style={{
              fontSize: 17,
              color: "#444",
              lineHeight: 1.75,
              marginBottom: 28,
            }}
          >
            ZizkaDB is built and operated by an EU entity, ZIZKA AI S.L.
            (Málaga, Spain). Its causal event log, human-oversight tooling,
            and data-erasure controls are designed to give providers and
            deployers of AI agent systems the operational evidence the EU AI
            Act expects — without becoming a compliance program in itself.
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 48,
            }}
          >
            <a href="#compliance-mapping" style={primaryLinkBtn}>
              View article mapping
            </a>
            <Link href="/enterprise#contact" style={outlineLinkBtn}>
              Talk to us
            </Link>
          </div>

          <Section id="overview" title="Overview" first>
            <p style={p}>
              The EU AI Act (Regulation (EU) 2024/1689) entered into force in
              August 2024, with obligations phasing in through 2026–2027
              depending on a system&apos;s risk classification. It places
              record-keeping, transparency, and human-oversight duties on
              providers and deployers of AI systems — obligations that are
              hardest to meet when an agent&apos;s decision history lives only in
              scattered application logs.
            </p>
            <p style={p}>
              ZizkaDB stores every agent decision, tool call, and outcome as
              a causally-linked event. Because that history is queryable,
              inspectable, and erasable by design, it maps directly onto
              several of the Act&apos;s technical requirements — summarized
              below.
            </p>
          </Section>

          <Section id="compliance-mapping" title="Article mapping">
            <p style={p}>
              How ZizkaDB&apos;s existing capabilities relate to specific AI Act
              provisions. Citations are the relevant articles to review with
              your legal team, not an exhaustive compliance checklist.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={{ ...th, width: "26%" }}>Requirement</th>
                    <th style={{ ...th, width: "18%" }}>Articles</th>
                    <th style={th}>How ZizkaDB supports it</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPLIANCE_ROWS.map((row) => (
                    <tr key={row.requirement}>
                      <td style={{ ...td, fontWeight: 600 }}>
                        {row.requirement}
                      </td>
                      <td style={td}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                          }}
                        >
                          {row.articles.map((a) => (
                            <span key={a} style={articleBadge}>
                              {a}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={td}>{row.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="architecture" title="Architecture & distribution">
            <p style={p}>
              The same open-core engine runs across every deployment mode, so
              the compliance posture above holds whether you self-host or use
              managed cloud.
            </p>
            <div
              className="ai-act-arch-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                margin: "20px 0 8px",
              }}
            >
              <div style={infoCard}>
                <h3 style={{ ...h3, marginTop: 0 }}>Operational database</h3>
                <ul style={ul}>
                  <li>Model agnostic — works with any LLM provider</li>
                  <li>Pre-built embeddings pipeline for semantic search</li>
                </ul>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#888",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    margin: "16px 0 8px",
                  }}
                >
                  Built with time-tested engines
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {["PostgreSQL", "pgvector", "Qdrant", "Ollama (self-hosted)"].map(
                    (tag) => (
                      <span key={tag} style={techTag}>
                        {tag}
                      </span>
                    )
                  )}
                </div>
              </div>

              <div style={infoCard}>
                <h3 style={{ ...h3, marginTop: 0 }}>Distribution</h3>
                <ul style={ul}>
                  <li>Self-hosted SDKs — Python, npm, MCP, LangChain, CrewAI</li>
                  <li>Managed cloud — Pro and Team plans</li>
                  <li>Design partnerships for SMEs</li>
                  <li>
                    AGPL-3.0 license, with a commercial{" "}
                    <Link href="/enterprise" style={link}>
                      Enterprise
                    </Link>{" "}
                    license (VPC deployment + SLA) for organizations that
                    need it
                  </li>
                </ul>
              </div>
            </div>
          </Section>

          <Section id="data-protection" title="Data protection & GDPR">
            <p style={p}>
              The AI Act&apos;s record-keeping duties sit alongside your existing
              GDPR obligations, not in place of them. ZizkaDB is built to
              satisfy both together:
            </p>
            <ul style={ul}>
              <li>
                Operated by an EU entity, ZIZKA AI S.L. (Málaga, Spain), under
                a published{" "}
                <Link href="/privacy" style={link}>
                  privacy policy
                </Link>
              </li>
              <li>
                <code style={codeInline}>forget()</code> deletes matching
                events and their vector embeddings together, by metadata
                filter
              </li>
              <li>Marketing opt-out controls for contacts stored in ZizkaDB</li>
              <li>
                Self-hosting and Enterprise VPC options for organizations with
                data-residency requirements
              </li>
            </ul>
          </Section>

          <Section id="disclaimer" title="Important disclaimer">
            <div style={disclaimerBox}>
              This page explains how ZizkaDB&apos;s existing features can support
              your organization&apos;s EU AI Act conformity work. It is general
              product information, not legal advice, and does not by itself
              constitute a conformity assessment, a Quality Management
              System, or CE marking. Your actual obligations depend on your
              AI system&apos;s risk classification and your role as provider or
              deployer (Art. 6, Annex III) — consult qualified legal counsel
              to confirm what applies to your organization.
            </div>
          </Section>

          <Section id="faq" title="FAQ">
            <div
              style={{
                border: "1px solid #eee",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              {FAQ_ITEMS.map((item, i) => (
                <details
                  key={item.q}
                  className="ai-act-faq-item"
                  style={{
                    borderBottom:
                      i === FAQ_ITEMS.length - 1 ? "none" : "1px solid #eee",
                  }}
                >
                  <summary
                    style={{
                      padding: "16px 18px",
                      fontSize: 14.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      listStyle: "none",
                    }}
                  >
                    {item.q}
                  </summary>
                  <div style={{ padding: "0 18px 16px" }}>
                    <p style={{ ...p, margin: 0 }}>{item.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </Section>

          <Section id="contact" title="Contact">
            <p style={p}>
              Questions about how ZizkaDB fits your compliance program, or
              need a signed DPA for procurement?
            </p>
            <table style={table}>
              <tbody>
                {[
                  ["Enterprise & compliance", "/enterprise#contact"],
                  ["Privacy policy", "/privacy"],
                  ["Email", `mailto:${FOUNDER_EMAIL}`],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ ...td, width: "34%", fontWeight: 500 }}>
                      {k}
                    </td>
                    <td style={td}>
                      <a href={v} style={link}>
                        {k === "Email" ? FOUNDER_EMAIL : v}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </main>
      </div>

      <MarketingFooter />

      <style>{`
        @media (min-width: 900px) {
          .ai-act-sidebar { display: block !important; }
        }
        @media (max-width: 640px) {
          .ai-act-arch-grid { grid-template-columns: 1fr !important; }
        }
        .ai-act-faq-item summary::-webkit-details-marker { display: none; }
        .ai-act-faq-item summary:focus-visible {
          outline: 2px solid ${BRAND};
          outline-offset: -2px;
        }
      `}</style>
    </div>
  );
}

function Section({
  id,
  title,
  first,
  children,
}: {
  id: string;
  title: string;
  first?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} style={{ marginBottom: 56, scrollMarginTop: 72 }}>
      <h2
        style={{
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 16,
          letterSpacing: -0.3,
          paddingTop: first ? 0 : 8,
          borderTop: first ? "none" : "1px solid #f0f0f0",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
