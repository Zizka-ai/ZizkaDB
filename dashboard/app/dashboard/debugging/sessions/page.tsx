"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getAgents,
  getAgentSessions,
  getMemoryDiff,
  type Agent,
  type AgentSession,
} from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { format } from "date-fns";
import { Layers, Loader2, AlertCircle, AlertTriangle, GitBranch } from "lucide-react";

interface SessionDiff {
  session_id: string;
  agent: string;
  event_count: number;
  event_types: Record<string, number>;
  causal_depth: number;
  has_errors: boolean;
  duration_seconds: number | null;
  new_event_types: string[];
  top_events: { event_id: string; event: string; data: unknown; timestamp: string }[];
  summary: string;
}

export default function SessionInsightsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agent, setAgent] = useState("");
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [diff, setDiff] = useState<SessionDiff | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = requireAuth();
        const list = await getAgents(token);
        if (cancelled) return;
        setAgents(list);
        if (list.length > 0) setAgent(list[0].agent);
      } catch {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load sessions when the agent changes.
  useEffect(() => {
    if (!agent) return;
    let cancelled = false;
    (async () => {
      setLoadingSessions(true);
      setSessions([]);
      setSessionId("");
      setDiff(null);
      try {
        const token = requireAuth();
        const list = await getAgentSessions(token, agent);
        if (!cancelled) setSessions(list);
      } catch {
        /* noop */
      } finally {
        if (!cancelled) setLoadingSessions(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agent]);

  async function inspect(sid: string) {
    setSessionId(sid);
    if (!sid) {
      setDiff(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const token = requireAuth();
      const d = (await getMemoryDiff(token, sid)) as unknown as SessionDiff;
      setDiff(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session insights.");
      setDiff(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <Layers size={17} style={{ color: "#22c55e" }} />
          <h1 className="text-white font-semibold text-xl">Session Insights</h1>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "#a3a3a3" }}>
          Summarize a session and see what was new or anomalous compared to the agent&apos;s
          earlier runs.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#d4d4d4" }}>
            Agent
          </label>
          {agents.length > 0 ? (
            <select
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
              className="w-full rounded-lg px-3.5 py-2.5 text-sm font-mono text-white outline-none"
              style={{ background: "#0d0d0d", border: "1px solid #262626" }}
            >
              {agents.map((a) => (
                <option key={a.agent} value={a.agent}>
                  {a.agent}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
              placeholder="agent name"
              className="w-full rounded-lg px-3.5 py-2.5 text-sm font-mono text-white outline-none"
              style={{ background: "#0d0d0d", border: "1px solid #262626" }}
            />
          )}
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#d4d4d4" }}>
            Session {loadingSessions && <span style={{ color: "#666" }}>· loading…</span>}
          </label>
          <select
            value={sessionId}
            onChange={(e) => inspect(e.target.value)}
            disabled={sessions.length === 0}
            className="w-full rounded-lg px-3.5 py-2.5 text-sm font-mono text-white outline-none disabled:opacity-50"
            style={{ background: "#0d0d0d", border: "1px solid #262626" }}
          >
            <option value="">
              {sessions.length === 0 ? "no sessions" : `select a session (${sessions.length})`}
            </option>
            {sessions.map((s) => (
              <option key={s.session_id} value={s.session_id}>
                {s.session_id} · {s.event_count} events
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm py-8" style={{ color: "#a3a3a3" }}>
          <Loader2 size={14} className="animate-spin" />
          Analyzing session…
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

      {diff && !loading && (
        <div className="space-y-4">
          {/* Summary */}
          <div
            className="rounded-xl p-5"
            style={{ background: "#111", border: `1px solid ${diff.has_errors ? "#3a1f1f" : "#1f2a1f"}` }}
          >
            <div className="flex items-center gap-2 mb-2">
              {diff.has_errors ? (
                <AlertTriangle size={15} style={{ color: "#f87171" }} />
              ) : (
                <Layers size={15} style={{ color: "#22c55e" }} />
              )}
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: diff.has_errors ? "#f87171" : "#22c55e" }}
              >
                {diff.has_errors ? "Errors detected" : "Clean session"}
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "#e5e5e5" }}>
              {diff.summary}
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 text-xs" style={{ color: "#a3a3a3" }}>
              <span>
                <span style={{ color: "#666" }}>events</span> {diff.event_count}
              </span>
              <span>
                <span style={{ color: "#666" }}>causal depth</span> {diff.causal_depth}
              </span>
              <span>
                <span style={{ color: "#666" }}>duration</span>{" "}
                {diff.duration_seconds != null ? `${diff.duration_seconds.toFixed(1)}s` : "—"}
              </span>
              <span>
                <span style={{ color: "#666" }}>agent</span>{" "}
                <span className="font-mono" style={{ color: "#d4d4d4" }}>
                  {diff.agent}
                </span>
              </span>
            </div>
          </div>

          {/* New event types */}
          {diff.new_event_types.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: "#111", border: "1px solid #1f1f1f" }}>
              <div className="text-xs font-medium mb-2" style={{ color: "#fbbf24" }}>
                New in this session ({diff.new_event_types.length}) — not seen in prior runs
              </div>
              <div className="flex flex-wrap gap-1.5">
                {diff.new_event_types.map((t) => (
                  <span
                    key={t}
                    className="text-xs font-mono px-2 py-0.5 rounded"
                    style={{ background: "#1f1a10", color: "#fcd34d" }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Event type breakdown */}
          <div className="rounded-xl p-4" style={{ background: "#111", border: "1px solid #1f1f1f" }}>
            <div className="text-xs font-medium mb-2" style={{ color: "#a3a3a3" }}>
              Event types
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(diff.event_types).map(([t, c]) => (
                <span
                  key={t}
                  className="text-xs font-mono px-2 py-0.5 rounded"
                  style={{ background: "#1a1a1a", color: "#d4d4d4" }}
                >
                  {t} · {c}
                </span>
              ))}
            </div>
          </div>

          {/* Top events → trace */}
          {diff.top_events.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: "#111", border: "1px solid #1f1f1f" }}>
              <div className="text-xs font-medium mb-2" style={{ color: "#a3a3a3" }}>
                First events
              </div>
              <div className="space-y-1.5">
                {diff.top_events.map((e) => (
                  <div key={e.event_id} className="flex items-center gap-2 text-xs">
                    <span className="font-mono" style={{ color: "#d4d4d4" }}>
                      {e.event}
                    </span>
                    <span className="font-mono" style={{ color: "#666" }}>
                      {e.timestamp ? format(new Date(e.timestamp), "HH:mm:ss") : ""}
                    </span>
                    <Link
                      href={`/dashboard/debugging/why?event_id=${encodeURIComponent(e.event_id)}`}
                      className="flex items-center gap-1 ml-auto shrink-0 transition"
                      style={{ color: "#22c55e" }}
                    >
                      <GitBranch size={11} /> Trace
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!diff && !loading && !error && (
        <div
          className="text-center py-16 px-6 rounded-xl text-sm"
          style={{ background: "#0d0d0d", border: "1px dashed #262626", color: "#a3a3a3" }}
        >
          Pick an agent and a session to see its insights.
        </div>
      )}
    </div>
  );
}
