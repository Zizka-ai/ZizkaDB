"use client";

import Link from "next/link";
import {
  GitBranch,
  GitFork,
  AlertTriangle,
  Rewind,
  Layers,
  Search,
} from "lucide-react";

const TOOLS = [
  {
    href: "/dashboard/debugging/why",
    label: "Causal Trace",
    icon: GitBranch,
    desc: "Trace an event back through its causal chain to the root cause — why did this happen?",
  },
  {
    href: "/dashboard/debugging/impact",
    label: "Impact Trace",
    icon: GitFork,
    desc: "See everything an event caused downstream — its blast radius.",
  },
  {
    href: "/dashboard/debugging/errors",
    label: "Error Explorer",
    icon: AlertTriangle,
    desc: "Every failure across your agents, grouped for triage. Jump to any root cause.",
  },
  {
    href: "/dashboard/debugging/time-travel",
    label: "Time Travel",
    icon: Rewind,
    desc: "Reconstruct an agent's state at any past moment — what did it know then?",
  },
  {
    href: "/dashboard/debugging/sessions",
    label: "Session Insights",
    icon: Layers,
    desc: "Summarize a session and see what was new or anomalous vs prior runs.",
  },
  {
    href: "/dashboard/search",
    label: "Semantic Search",
    icon: Search,
    desc: "Find events across your agents by natural-language meaning.",
  },
];

export default function DebuggingHubPage() {
  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-white font-semibold text-xl mb-1">Debugging</h1>
        <p className="text-sm leading-relaxed" style={{ color: "#a3a3a3" }}>
          Ready-made queries for investigating agent behavior. Pick a tool to trace
          causality, reconstruct past state, triage failures, or search your history.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className="rounded-xl p-4 transition group"
              style={{ background: "#111", border: "1px solid #1f1f1f" }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Icon size={16} style={{ color: "#22c55e" }} />
                <span className="text-sm font-semibold text-white">{t.label}</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#a3a3a3" }}>
                {t.desc}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
