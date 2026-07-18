"use client";

import { useEffect, useState } from "react";
import { getAgents, timeTravel, type Agent } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { format } from "date-fns";
import { Rewind, Loader2, AlertCircle, Zap } from "lucide-react";

interface TTResult {
  agent: string;
  at: string;
  event_count: number;
  state: Record<string, unknown>;
}

export default function TimeTravelPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agent, setAgent] = useState("");
  const [ts, setTs] = useState("");
  const [result, setResult] = useState<TTResult | null>(null);
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
        /* leave agent empty; user can still type */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function reconstruct(e: React.FormEvent) {
    e.preventDefault();
    if (!agent) {
      setError("Pick an agent first.");
      return;
    }
    if (!ts) {
      setError("Pick a date and time first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const token = requireAuth();
      const iso = new Date(ts).toISOString();
      const res = (await timeTravel(token, agent, iso)) as unknown as TTResult;
      setResult(res);
    } catch (err) {
      const m = (err instanceof Error ? err.message : "").toLowerCase();
      setError(
        m.includes("failed to fetch") || m.includes("networkerror")
          ? "Couldn't reach the server. Check that the API is running, then retry."
          : err instanceof Error
            ? err.message
            : "Failed to reconstruct state.",
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function quickPick(hoursAgo: number) {
    const d = new Date(Date.now() - hoursAgo * 3600_000);
    // format for datetime-local (local time, no seconds)
    const pad = (n: number) => String(n).padStart(2, "0");
    setTs(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
    );
  }

  const state = result?.state ?? {};
  const keys = Object.keys(state);
  const onlyLastEvent = keys.length === 1 && keys[0] === "_last_event";
  const isEmpty = keys.length === 0;

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <Rewind size={17} style={{ color: "#22c55e" }} />
          <h1 className="text-white font-semibold text-xl">Time Travel</h1>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "#a3a3a3" }}>
          Reconstruct an agent&apos;s state at any past moment — everything it had logged
          up to that point. Built from its{" "}
          <span className="font-mono" style={{ color: "#d4d4d4" }}>
            STATE_SET
          </span>{" "}
          events.
        </p>
      </div>

      <form onSubmit={reconstruct} className="mb-6 space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#d4d4d4" }}>
            Agent
          </label>
          {agents.length > 0 ? (
            <select
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
              className="w-full rounded-lg px-3.5 py-2.5 text-sm font-mono text-white outline-none transition"
              style={{ background: "#0d0d0d", border: "1px solid #262626" }}
            >
              {agents.map((a) => (
                <option key={a.agent} value={a.agent}>
                  {a.agent} ({a.event_count} events)
                </option>
              ))}
            </select>
          ) : (
            <input
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
              placeholder="agent name"
              className="w-full rounded-lg px-3.5 py-2.5 text-sm font-mono text-white outline-none transition"
              style={{ background: "#0d0d0d", border: "1px solid #262626" }}
            />
          )}
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#d4d4d4" }}>
            Point in time
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="datetime-local"
              value={ts}
              onChange={(e) => setTs(e.target.value)}
              className="flex-1 rounded-lg px-3.5 py-2.5 text-sm font-mono text-white outline-none transition"
              style={{ background: "#0d0d0d", border: "1px solid #262626", colorScheme: "dark" }}
            />
            <button
              type="submit"
              disabled={loading || !agent || !ts}
              className="rounded-lg px-6 py-2.5 text-sm font-medium text-black disabled:opacity-40 transition shrink-0"
              style={{ background: "#22c55e" }}
            >
              {loading ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Reconstruct"}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[
              { label: "1 hour ago", h: 1 },
              { label: "6 hours ago", h: 6 },
              { label: "1 day ago", h: 24 },
              { label: "1 week ago", h: 168 },
            ].map((q) => (
              <button
                key={q.h}
                type="button"
                onClick={() => quickPick(q.h)}
                className="text-xs px-2.5 py-1 rounded-lg transition"
                style={{ background: "#111", border: "1px solid #1f1f1f", color: "#a3a3a3" }}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      </form>

      {error && (
        <div
          className="flex items-start gap-2.5 rounded-xl px-4 py-3 mb-6 text-sm"
          style={{ background: "#1f1414", border: "1px solid #3a1f1f", color: "#f87171" }}
        >
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-4" style={{ background: "#111", border: "1px solid #1f1f1f" }}>
              <div className="text-xs mb-1" style={{ color: "#a3a3a3" }}>
                Events at this time
              </div>
              <div className="text-2xl font-bold font-mono text-white">{result.event_count}</div>
            </div>
            <div className="rounded-xl p-4" style={{ background: "#111", border: "1px solid #1f1f1f" }}>
              <div className="text-xs mb-1" style={{ color: "#a3a3a3" }}>
                Reconstructed at
              </div>
              <div className="text-sm font-mono text-white">
                {ts ? format(new Date(ts), "MMM d yyyy, HH:mm") : "—"}
              </div>
            </div>
          </div>

          <div className="rounded-xl" style={{ background: "#111", border: "1px solid #1f1f1f" }}>
            <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: "#1f1f1f" }}>
              <Zap size={13} style={{ color: "#22c55e" }} />
              <span className="text-sm font-medium text-white">
                {onlyLastEvent ? "Most recent event at this time" : "Reconstructed state"}
              </span>
            </div>
            {onlyLastEvent && (
              <div className="px-4 py-3 text-xs border-b" style={{ color: "#a3a3a3", borderColor: "#1f1f1f" }}>
                This agent doesn&apos;t log{" "}
                <span className="font-mono" style={{ color: "#d4d4d4" }}>
                  STATE_SET
                </span>
                /
                <span className="font-mono" style={{ color: "#d4d4d4" }}>
                  STATE_DELETE
                </span>{" "}
                events, so there&apos;s no key/value state to rebuild. Showing the most recent event
                before this time instead.
              </div>
            )}
            {isEmpty ? (
              <div className="p-4 text-xs" style={{ color: "#a3a3a3" }}>
                No events had been logged for this agent yet at this time.
              </div>
            ) : (
              <pre className="p-4 text-xs overflow-auto" style={{ color: "#86efac", maxHeight: 320 }}>
                {JSON.stringify(state, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {!result && !loading && !error && (
        <div
          className="text-center py-16 px-6 rounded-xl text-sm"
          style={{ background: "#0d0d0d", border: "1px dashed #262626", color: "#a3a3a3" }}
        >
          Pick an agent and a point in time to reconstruct its state.
        </div>
      )}
    </div>
  );
}
