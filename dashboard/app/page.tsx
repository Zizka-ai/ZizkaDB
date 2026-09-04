"use client";

import Link from "next/link";
import { IntegrationStrip } from "@/components/marketing/IntegrationStrip";
import { CompetitorCompare } from "@/components/marketing/CompetitorCompare";
import { ConversationCompare } from "@/components/marketing/ConversationCompare";
import { TrustBar } from "@/components/marketing/TrustBar";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { HeroOperationalField } from "@/components/marketing/HeroOperationalField";
import { LiveDashboardDemo } from "@/components/marketing/LiveDashboardDemo";
import { PricingCard } from "@/components/marketing/PricingCard";
import { StartTrialButton } from "@/components/marketing/StartTrialButton";
import { LANDING_PRICING_PLANS } from "@/components/marketing/pricing-plans";
import { BRAND } from "@/components/brand";
import {
  M,
  container,
  h2,
  lead,
  sectionTitle,
  primaryBtn,
  secondaryBtn,
  ghostBtn,
  outlineBtn,
  card,
} from "@/components/marketing/marketing-theme";
import { GITHUB_URL } from "@/lib/constants";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

const HERO_TITLE = "Dont Observe - Audit your AI Agent";
const HERO_VALUE =
  "When production agents drift, guesswork costs hours. ZizkaDB gives you replay, lineage, and drift alerts so you fix behavior before users notice.";

const MCP_CONFIG = `{
  "mcpServers": {
    "zizkadb": {
      "command": "uvx",
      "args": ["zizkadb-mcp"],
      "env": { "ZIZKADB_API_KEY": "zizkadb_live_xxxx" }
    }
  }
}`;

const WHY_BOXES = [
  {
    label: "How agents fail in prod",
    accent: M.danger,
    items: [
      "Prompt tweaks silently change decisions",
      "Tool calls skip policy without anyone noticing",
      "Same question, different answers across sessions",
      "Logs show what happened — not why",
    ],
  },
  {
    label: "What that costs you",
    accent: BRAND,
    items: [
      "Wrong answers reach customers",
      "Engineering burns time on blind debugging",
      "Token spend climbs as agents retry",
      "Trust erodes before you find root cause",
    ],
  },
  {
    label: "With ZizkaDB",
    accent: M.success,
    items: [
      "Replay any session end-to-end",
      "Measure drift against your baseline",
      "Trace decisions with causal lineage",
      "Catch regressions before they ship",
    ],
  },
];

export default function LandingPage() {
  const { copied, copy } = useCopyToClipboard();

  return (
    <MarketingShell active="home">
      {/* Hero */}
      <section
        className="zdb-section"
        style={{
          padding: "88px 40px 72px",
          position: "relative",
          overflow: "hidden",
          background: "#000000",
          borderBottom: `1px solid ${M.line}`,
        }}
      >
        <HeroOperationalField />
        <div style={{ ...container(820), textAlign: "center", position: "relative", zIndex: 2 }}>
          <p style={{ ...sectionTitle, marginBottom: 16 }} className="zdb-section-title">
            Operational intelligence for AI agents
          </p>
          <h1
            className="zdb-hero-title"
            style={{
              fontSize: 48,
              fontWeight: 800,
              lineHeight: 1.1,
              margin: "0 0 20px",
              letterSpacing: -0.9,
              color: M.ink,
            }}
          >
            {HERO_TITLE}
          </h1>
          <p
            className="zdb-hero-value"
            style={{
              fontSize: 18,
              color: M.muted,
              margin: "0 auto 36px",
              lineHeight: 1.65,
              maxWidth: 560,
            }}
          >
            {HERO_VALUE}
          </p>

          <div
            className="zdb-hero-btns"
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
              marginBottom: 48,
            }}
          >
            <StartTrialButton style={primaryBtn}>
              Use managed cloud
            </StartTrialButton>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              style={secondaryBtn}
            >
              Self-host open source
            </a>
          </div>

          <div style={{ marginTop: 8 }}>
            <IntegrationStrip dark />
          </div>
        </div>
      </section>

      {/* Dual path + live demo */}
      <section
        className="zdb-section"
        style={{ padding: "80px 40px", background: M.bgElevated }}
      >
        <div style={container(1100)}>
          <p style={sectionTitle}>Two ways to run ZizkaDB</p>
          <h2 className="zdb-section-h2" style={h2}>Same product. Your infrastructure or ours.</h2>
          <p className="zdb-lead" style={{ ...lead, marginBottom: 48 }}>
            Explore the dashboard your team gets — self-host the OSS stack or use managed cloud with Fleet.
          </p>

          <div
            className="zdb-split"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 28,
              alignItems: "start",
            }}
          >
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: M.ink, margin: "0 0 8px" }}>
                Open source
              </h3>
              <p style={{ fontSize: 14, color: M.muted, margin: "0 0 16px", lineHeight: 1.6 }}>
                Docker Compose on your infra. Activity, Behavior, Reports, and Suggestions out of the box.
              </p>
              <LiveDashboardDemo variant="oss" autoRotateMs={6000} />
              <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href="/docs" style={{ ...outlineBtn, fontSize: 13 }}>
                  Setup guide
                </Link>
                <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={{ ...outlineBtn, fontSize: 13 }}>
                  GitHub
                </a>
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: M.ink, margin: "0 0 8px" }}>
                Managed cloud
              </h3>
              <p style={{ fontSize: 14, color: M.muted, margin: "0 0 16px", lineHeight: 1.6 }}>
                Hosted on db.zizka.ai — includes Fleet ranking across agents and projects.
              </p>
              <LiveDashboardDemo variant="managed" autoRotateMs={6000} />
              <div style={{ marginTop: 16 }}>
                <StartTrialButton style={{ ...primaryBtn, fontSize: 14, padding: "12px 22px" }}>
                  Get started
                </StartTrialButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="zdb-section" style={{ padding: "80px 40px", background: M.bg }}>
        <div style={container(1000)}>
          <p style={sectionTitle}>Why ZizkaDB</p>
          <h2 className="zdb-section-h2" style={h2}>Stop debugging agents in the dark.</h2>
          <p className="zdb-lead" style={{ ...lead, marginBottom: 40 }}>
            Production agents need operational data — not just logs. ZizkaDB monitors behavior so your team can correct it.
          </p>

          <div
            className="zdb-why-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 20,
            }}
          >
            {WHY_BOXES.map((box) => (
              <div
                key={box.label}
                style={{
                  ...card,
                  padding: "28px 24px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    display: "inline-block",
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 0.8,
                    textTransform: "uppercase" as const,
                    color: box.accent,
                    marginBottom: 16,
                    padding: "4px 10px",
                    background: `${box.accent}18`,
                    borderRadius: 6,
                    alignSelf: "flex-start",
                  }}
                >
                  {box.label}
                </div>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {box.items.map((item) => (
                    <li
                      key={item}
                      style={{
                        display: "flex",
                        gap: 10,
                        fontSize: 14,
                        color: M.inkSoft,
                        lineHeight: 1.55,
                      }}
                    >
                      <span style={{ color: box.accent, fontWeight: 800, flexShrink: 0 }}>
                        {box.accent === M.success ? "✓" : "·"}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ConversationCompare />

      {/* Integrate */}
      <section className="zdb-section" style={{ padding: "88px 40px", background: M.bgElevated }}>
        <div style={container(960)}>
          <p style={sectionTitle}>For teams building with agents</p>
          <h2 className="zdb-section-h2" style={h2}>Integrate in an afternoon. Debug in minutes.</h2>
          <p className="zdb-lead" style={lead}>
            Log from Python, TypeScript, MCP, or REST. One API key per agent — no heavy infra project.
          </p>

          <div
            className="zdb-split zdb-split-3"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 20,
            }}
          >
            <FeatureCard
              icon="⚙️"
              title="Connect your stack"
              body="Python SDK, TypeScript SDK, MCP, or REST. Self-host with Docker or use managed cloud."
              actions={
                <>
                  <Link href="/docs" style={{ ...secondaryBtn, fontSize: 14, padding: "12px 20px" }}>
                    5-minute setup
                  </Link>
                  <button
                    type="button"
                    onClick={() => copy(MCP_CONFIG)}
                    style={{ ...outlineBtn, cursor: "pointer" }}
                  >
                    {copied ? "Copied MCP config" : "Copy MCP config"}
                  </button>
                </>
              }
            />
            <FeatureCard
              icon="🔍"
              title="Debug production incidents"
              body="Prompt change broke behavior? Replay the full session, trace the decision chain, find root cause."
              actions={
                <StartTrialButton style={{ ...primaryBtn, fontSize: 14, padding: "12px 22px" }}>
                  Get started
                </StartTrialButton>
              }
            />
            <FeatureCard
              icon="🐳"
              title="Self-host on your infrastructure"
              body="Run the full stack with Docker Compose on your machine or VPC. AGPL core, your data stays yours."
              actions={
                <Link href="/docs" style={{ ...outlineBtn, fontSize: 14, padding: "12px 22px" }}>
                  Self-hosting guide
                </Link>
              }
            />
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="zdb-section" style={{ padding: "72px 40px", background: M.bg }}>
        <div style={container(960)}>
          <p style={sectionTitle}>Trust and security</p>
          <h2 className="zdb-section-h2" style={{ ...h2, marginBottom: 36 }}>Production-ready from day one</h2>
          <TrustBar />
        </div>
      </section>

      {/* Pricing */}
      <section
        id="pricing"
        className="zdb-section zdb-section-anchor"
        style={{ padding: "88px 40px", background: M.bgElevated }}
      >
        <div style={container(1120)}>
          <p style={sectionTitle}>Pricing</p>
          <h2 className="zdb-section-h2" style={h2}>Self-host free. Scale on cloud when you need to.</h2>
          <p className="zdb-lead" style={lead}>Full monitoring and session replay on every plan.</p>

          <div
            className="zdb-price-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 20,
              alignItems: "stretch",
            }}
          >
            {LANDING_PRICING_PLANS.map((plan) => (
              <PricingCard key={plan.name} plan={plan} />
            ))}
          </div>
        </div>
      </section>

      <CompetitorCompare />

      {/* Final CTA */}
      <section
        className="zdb-section"
        style={{
          padding: "88px 40px",
          background: "#000000",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <HeroOperationalField variant="subtle" />
        <div
          style={{
            ...container(600),
            textAlign: "center",
            position: "relative",
            zIndex: 2,
          }}
        >
          <h2
            className="zdb-final-cta-title zdb-section-h2"
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: M.ink,
              margin: "0 0 14px",
              letterSpacing: -0.6,
              lineHeight: 1.15,
            }}
          >
            Fix behavior before production breaks
          </h2>
          <p
            style={{
              fontSize: 17,
              color: M.muted,
              margin: "0 0 28px",
              lineHeight: 1.65,
            }}
          >
            Managed cloud on db.zizka.ai, or self-host the open source stack anytime.
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
            <StartTrialButton style={primaryBtn}>
              Use managed cloud
            </StartTrialButton>
            <Link href="/docs" style={ghostBtn}>
              Read the docs
            </Link>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={ghostBtn}>
              GitHub
            </a>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

function FeatureCard({
  icon,
  title,
  body,
  actions,
}: {
  icon: string;
  title: string;
  body: string;
  actions: React.ReactNode;
}) {
  return (
    <div className="zdb-feature-card" style={{ ...card, padding: "32px 28px" }}>
      <div style={{ fontSize: 28, marginBottom: 16 }}>{icon}</div>
      <h3 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 10px", color: M.ink }}>
        {title}
      </h3>
      <p style={{ fontSize: 15, color: M.muted, lineHeight: 1.65, margin: "0 0 20px" }}>
        {body}
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{actions}</div>
    </div>
  );
}
