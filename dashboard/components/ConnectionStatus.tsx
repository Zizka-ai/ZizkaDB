"use client";

import { useEffect, useState } from "react";
import { API } from "@/lib/api";
import { IS_DEV_MODE as IS_DEV } from "@/lib/constants";

const SETUP_SCRIPT_HINT = "bash scripts/setup-local.sh";

function pythonQuickstartSnippet(clientArg: string): string {
  return `pip install zizkadb-sdk
python -c "
import asyncio
from zizkadb import ZizkaDB
async def main():
    async with ZizkaDB(${clientArg}) as db:
        r = await db.log(agent='my-bot', event='started', data={'ok': True})
        print('Logged:', r.event_id)
asyncio.run(main())"`;
}

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
      {health === "error" && (
        <span style={{ color: "#f87171" }}>
          Start API:{" "}
          <code style={{ fontFamily: "monospace" }}>{SETUP_SCRIPT_HINT}</code>
        </span>
      )}
    </div>
  );
}

export function GettingStartedChecklist() {
  const snippet = IS_DEV
    ? `# Self-host — same tenant as "Open my dashboard →"\n${pythonQuickstartSnippet("host='http://localhost:8000'")}`
    : `# Managed cloud — use your key from Settings\n${pythonQuickstartSnippet("'zizkadb_live_YOUR_KEY'")}`;

  const steps = [
    {
      title: "API is running",
      desc: IS_DEV
        ? `Green dot above = API reachable. If red, run ${SETUP_SCRIPT_HINT}`
        : "Your ZizkaDB API should respond at db.zizka.ai/health",
    },
    {
      title: "Log your first event",
      desc: "Run the snippet below in a terminal. Use the same API key / host as this dashboard account.",
    },
    {
      title: "Watch it live",
      desc: "Your agent appears here within 30 seconds — no refresh needed. Click it for events, sessions, and drift.",
    },
  ];

  return (
    <div
      className="rounded-xl p-8"
      style={{ background: "#111", border: "1px solid #1f1f1f" }}
    >
      <h3 className="text-white font-medium mb-1">Getting started</h3>
      <p className="text-sm mb-6" style={{ color: "#e5e5e5" }}>
        Three steps to see your first agent in the dashboard.
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
      <p className="text-xs mt-4" style={{ color: "#e5e5e5" }}>
        Dashboard empty but SDK works? Your SDK and login must share the same
        tenant — see{" "}
        <a href="/docs" style={{ color: "#e5e5e5" }}>
          Self-host docs
        </a>
        .
      </p>
    </div>
  );
}
