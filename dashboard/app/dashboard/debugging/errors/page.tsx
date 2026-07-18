"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getErrors, type ErrorReport, type ErrorGroup } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { format } from "date-fns";
import {
  AlertTriangle,
  Loader2,
  AlertCircle,
  GitBranch,
  GitFork,
  Copy,
  Check,
} from "lucide-react";

const WINDOWS: { key: string; label: string }[] = [
  { key: "24h", label: "24h" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "all", label: "All time" },
];

function fmt(ts: string | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? ts : format(d, "MMM d, HH:mm");
}

export default function ErrorExplorerPage() {
  const [window, setWindow] = useState("7d");
  const [report, setReport] = useState<ErrorReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const token = requireAuth();
        const r = await getErrors(token, { window });
        if (!cancelled) setReport(r);
      } catch (err) {
        if (!cancelled) {
          const m = (err instanceof Error ? err.message : "").toLowerCase();
          setError(
            m.includes("failed to fetch") || m.includes("networkerror")
              ? "Couldn't reach the server. Check that the ZizkaDB API is running, then retry."
              : err instanceof Error
                ? err.message
                : "Failed to load errors.",
          );
          setReport(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [window]);

  async function copyId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
    } catch {
      /* noop */
    }
  }

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <AlertTriangle size={17} style={{ color: "#f87171" }} />
          <h1 className="text-white font-semibold text-xl">Error Explorer</h1>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "#a3a3a3" }}>
          Every failure across your agents, grouped for triage. Pick a group, then
          trace any instance to its root cause or downstream impact.
        </p>
      </div>

      {/* Window filter */}
      <div className="flex items-center gap-2 mb-6">
        {WINDOWS.map((w) => (
          <button
            key={w.key}
            onClick={() => setWindow(w.key)}
            className="text-xs px-3 py-1.5 rounded-lg transition"
            style={{
              background: window === w.key ? "#1a1a1a" : "transparent",
              border: `1px solid ${window === w.key ? "#3a3a3a" : "#1f1f1f"}`,
              color: window === w.key ? "#fff" : "#a3a3a3",
            }}
          >
            {w.label}
          </button>
        ))}
        {report && !loading && (
          <span className="text-xs ml-auto" style={{ color: "#737373" }}>
            {report.total_errors} error{report.total_errors !== 1 ? "s" : ""} ·{" "}
            {report.group_count} group{report.group_count !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm py-8" style={{ color: "#a3a3a3" }}>
          <Loader2 size={14} className="animate-spin" />
          Scanning for errors…
        </div>
      )}

      {error && !loading && (
        <div
          className="flex items-start gap-2.5 rounded-xl px-4 py-3 mb-6 text-sm"
          style={{ background: "#1f1414", border: "1px solid #3a1f1f", color: "#f87171" }}
        >
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && report && report.groups.length === 0 && (
        <div
          className="text-center py-16 px-6 rounded-xl text-sm"
          style={{ background: "#0d0d0d", border: "1px dashed #1f2a1f", color: "#a3a3a3" }}
        >
          <span style={{ color: "#22c55e" }}>No errors</span> in this window — your
          agents are running clean.
        </div>
      )}

      {!loading && !error && report && report.groups.length > 0 && (
        <div className="space-y-3">
          {report.groups.map((g) => (
            <ErrorGroupCard key={g.signature} group={g} copied={copied} onCopy={copyId} />
          ))}
        </div>
      )}
    </div>
  );
}

function ErrorGroupCard({
  group,
  copied,
  onCopy,
}: {
  group: ErrorGroup;
  copied: string | null;
  onCopy: (id: string) => void;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "#111", border: "1px solid #3a1f1f" }}
    >
      <div className="flex items-start gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-sm font-mono font-medium truncate"
              style={{ color: "#f87171" }}
            >
              {group.event_type}
            </span>
            {group.error && (
              <span
                className="text-xs font-mono px-1.5 py-0.5 rounded"
                style={{ background: "#2a1414", color: "#fca5a5" }}
              >
                {group.error}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs" style={{ color: "#a3a3a3" }}>
            <span>
              <span style={{ color: "#666" }}>count</span> {group.count}
            </span>
            <span>
              <span style={{ color: "#666" }}>agents</span> {group.agents_affected}
            </span>
            <span>
              <span style={{ color: "#666" }}>sessions</span> {group.sessions_affected}
            </span>
            <span>
              <span style={{ color: "#666" }}>last</span> {fmt(group.last_seen)}
            </span>
            <span>
              <span style={{ color: "#666" }}>first</span> {fmt(group.first_seen)}
            </span>
          </div>
          {group.agents.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {group.agents.map((a) => (
                <span
                  key={a}
                  className="text-xs font-mono px-1.5 py-0.5 rounded"
                  style={{ background: "#1a1a1a", color: "#a3a3a3" }}
                >
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>
        <span
          className="text-lg font-bold font-mono shrink-0"
          style={{ color: "#f87171" }}
        >
          {group.count}
        </span>
      </div>

      {/* Sample instances → trace */}
      {group.sample_event_ids.length > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: "1px solid #1f1f1f" }}>
          <div className="text-xs mb-2" style={{ color: "#666" }}>
            Trace an instance:
          </div>
          <div className="space-y-1.5">
            {group.sample_event_ids.map((id) => (
              <div key={id} className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono truncate" style={{ color: "#a3a3a3" }}>
                  {id}
                </span>
                <button
                  onClick={() => onCopy(id)}
                  className="shrink-0"
                  style={{ color: "#666" }}
                  title="Copy event ID"
                >
                  {copied === id ? (
                    <Check size={11} style={{ color: "#22c55e" }} />
                  ) : (
                    <Copy size={11} />
                  )}
                </button>
                <div className="flex gap-1.5 ml-auto shrink-0">
                  <Link
                    href={`/dashboard/debugging/why?event_id=${encodeURIComponent(id)}`}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition"
                    style={{ background: "#14241a", border: "1px solid #1f3a24", color: "#22c55e" }}
                  >
                    <GitBranch size={11} /> Root cause
                  </Link>
                  <Link
                    href={`/dashboard/debugging/impact?event_id=${encodeURIComponent(id)}`}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition"
                    style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#a3a3a3" }}
                  >
                    <GitFork size={11} /> Impact
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
