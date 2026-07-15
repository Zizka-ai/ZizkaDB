"use client";

import { useEffect, useState } from "react";
import { API } from "@/lib/api";
import { IS_DEV_MODE as IS_DEV } from "@/lib/constants";

type HealthState = "checking" | "ok" | "error";

export function ConnectionStatus() {
  const [health, setHealth] = useState<HealthState>("checking");
  const apiLabel = API || "same-origin (nginx)";

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch(`${API}/health`, { cache: "no-store" });
        if (!cancelled) setHealth(res.ok ? "ok" : "error");
      } catch {
        if (!cancelled) setHealth("error");
      }
    }
    check();
    const id = setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const dot =
    health === "ok" ? "#22c55e" : health === "error" ? "#ef4444" : "#e5e5e5";

  return (
    <div
      className="mx-8 mt-6 mb-0 rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs"
      style={{ background: "#111", border: "1px solid #1f1f1f" }}
    >
      <span className="flex items-center gap-2" style={{ color: "#e5e5e5" }}>
        <span
          className="inline-block w-2 h-2 rounded-full shrink-0"
          style={{ background: dot }}
        />
        API{" "}
        {health === "ok"
          ? "connected"
          : health === "error"
            ? "unreachable"
            : "checking…"}
        <code style={{ fontFamily: "monospace", color: "#e5e5e5" }}>
          {apiLabel}
        </code>
      </span>
      {IS_DEV && (
        <span style={{ color: "#22c55e" }}>Self-hosted · local dev tenant</span>
      )}
      {health === 'error' && (
        <span style={{ color: '#f87171' }}>
          Start stack: <code style={{ fontFamily: 'monospace' }}>bash scripts/quickstart.sh</code>
        </span>
      )}
    </div>
  );
}

export function GettingStartedChecklist() {
  const snippet = IS_DEV
    ? `# OSS — same tenant as "Open my dashboard →"
pip install zizkadb-sdk
zizkadb demo`
    : `# Managed cloud — use your key from Settings
pip install zizkadb-sdk
python -c "
import asyncio
from zizkadb import ZizkaDB
async def main():
    async with ZizkaDB('zizkadb_live_YOUR_KEY') as db:
        r = await db.log(agent='my-bot', event='started', data={'ok': True})
        print('Logged:', r.event_id)
asyncio.run(main())"`

  const steps = IS_DEV
    ? [
        {
          title: 'Run OSS quickstart',
          desc: 'From the repo: bash scripts/quickstart.sh — starts Docker + db.why() demo',
        },
        {
          title: 'Run the lineage demo',
          desc: 'pip install zizkadb-sdk && zizkadb demo — support-bot order delay scenario',
        },
        {
          title: 'Connect your agent',
          desc: 'See CONNECT.md on GitHub for Python, TypeScript, LangChain, CrewAI, MCP, REST',
        },
      ]
    : [
        {
          title: 'API is running',
          desc: 'Your ZizkaDB API should respond at db.zizka.ai/health',
        },
        {
          title: 'Log your first event',
          desc: 'Run the snippet below. Use the same API key / host as this dashboard account.',
        },
        {
          title: 'Watch it live',
          desc: 'Your agent appears here within 30 seconds — no refresh needed. Click it for events, sessions, and drift.',
        },
      ]

  return (
    <div
      className="rounded-xl p-8"
      style={{ background: "#111", border: "1px solid #1f1f1f" }}
    >
      <h3 className="text-white font-medium mb-1">Getting started</h3>
      <p className="text-sm mb-6" style={{ color: '#e5e5e5' }}>
        {IS_DEV
          ? 'OSS quickstart — taste causal lineage, then connect your stack.'
          : 'Three steps to see your first agent in the dashboard.'}
      </p>
      <ol className="space-y-4 mb-6 text-left">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <span
              className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "#22c55e", color: "#000" }}
            >
              {i + 1}
            </span>
            <div>
              <div className="text-sm font-medium text-white">{step.title}</div>
              <div className="text-xs mt-0.5" style={{ color: "#e5e5e5" }}>
                {step.desc}
              </div>
            </div>
          </li>
        ))}
      </ol>
      <pre
        className="text-left rounded-lg p-4 text-xs overflow-x-auto"
        style={{ background: "#0d0d0d", color: "#22c55e" }}
      >
        {snippet}
      </pre>
      <p className="text-xs mt-4" style={{ color: '#e5e5e5' }}>
        {IS_DEV ? (
          <>
            Connect guide:{' '}
            <a
              href="https://github.com/Zizka-ai/ZizkaDB/blob/main/CONNECT.md"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#e5e5e5' }}
            >
              CONNECT.md
            </a>
            {' '}· worked example:{' '}
            <a
              href="https://github.com/Zizka-ai/ZizkaDB/tree/main/worked/01-support-order-delay"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#e5e5e5' }}
            >
              01-support-order-delay
            </a>
          </>
        ) : (
          <>
            Dashboard empty but SDK works? Your SDK and login must share the same tenant — see{' '}
            <a href="/docs" style={{ color: '#e5e5e5' }}>Self-host docs</a>.
          </>
        )}
      </p>
    </div>
  );
}
