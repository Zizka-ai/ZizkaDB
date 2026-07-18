"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getImpactChain, type ImpactTree, type ImpactNode } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { format } from "date-fns";
import {
  GitFork,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  ArrowDownRight,
  Loader2,
  Crosshair,
} from "lucide-react";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_DEPTH = 50;

function isErrorEvent(t: string): boolean {
  const s = (t || "").toLowerCase();
  return s.includes("error") || s.includes("fail");
}
function validDate(ts: string): Date | null {
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
}
function fmtAbs(ts: string): string {
  const d = validDate(ts);
  return d ? format(d, "yyyy-MM-dd HH:mm:ss.SSS") : ts || "unknown time";
}
function fmtSpan(ms: number | null): string {
  if (ms === null || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3_600_000) return `${(ms / 60_000).toFixed(1)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}
function summarizeData(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const rec = data as Record<string, unknown>;
  const err = rec.error ?? rec.message;
  if (typeof err === "string" && err.trim()) return err;
  const entries = Object.entries(rec);
  if (entries.length === 0) return "";
  return entries
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${typeof v === "object" ? "{…}" : String(v).slice(0, 40)}`)
    .join("  ·  ");
}
function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const m = msg.toLowerCase();
  if (m.includes("not found")) {
    return "No event found with that ID in this workspace. Double-check the ID and try again.";
  }
  if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("load failed")) {
    return "Couldn't reach the server. Check that the ZizkaDB API is running, then retry.";
  }
  if (m.includes("invalid token") || m.includes("401") || m.includes("unauthorized")) {
    return "Your session expired. Please sign in again.";
  }
  return msg || "Something went wrong loading the impact chain.";
}

export default function ImpactPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <ImpactInner />
    </Suspense>
  );
}
function Fallback() {
  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto">
      <p style={{ color: "#a3a3a3" }}>Loading…</p>
    </div>
  );
}

function ImpactInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlEventId = searchParams.get("event_id") ?? "";

  const [eventIdInput, setEventIdInput] = useState(urlEventId);
  const [tree, setTree] = useState<ImpactTree | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    if (!urlEventId) {
      setTree(null);
      setError("");
      return;
    }
    const trimmed = urlEventId.trim();
    if (!UUID_RE.test(trimmed)) {
      setError(
        "That doesn't look like a valid event ID. It should be a UUID like 5cdb3f8c-3a85-46df-8034-184fb89a66a8.",
      );
      setTree(null);
      return;
    }
    (async () => {
      setLoading(true);
      setError("");
      try {
        const token = requireAuth();
        const result = await getImpactChain(token, trimmed, MAX_DEPTH);
        if (cancelled) return;
        setTree(result);
        // Open the searched event + any error nodes by default.
        const open = new Set<string>();
        for (const n of result.nodes) if (isErrorEvent(n.event)) open.add(n.event_id);
        if (result.nodes.length > 0) open.add(result.nodes[0].event_id);
        setExpanded(open);
      } catch (err) {
        if (cancelled) return;
        setError(friendlyError(err));
        setTree(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [urlEventId]);

  const errorCount = useMemo(
    () => (tree?.nodes ?? []).filter((n) => isErrorEvent(n.event)).length,
    [tree],
  );

  function navigateTo(eventId: string) {
    router.push(`/dashboard/debugging/impact?event_id=${encodeURIComponent(eventId)}`);
  }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = eventIdInput.trim();
    if (v) navigateTo(v);
  }
  function traceFrom(eventId: string) {
    setEventIdInput(eventId);
    navigateTo(eventId);
  }
  async function copyText(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }
  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const nodes = tree?.nodes ?? [];
  const span =
    nodes.length > 1
      ? (() => {
          const a = validDate(nodes[0].timestamp);
          const b = validDate(nodes[nodes.length - 1].timestamp);
          return a && b ? b.getTime() - a.getTime() : null;
        })()
      : 0;

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <GitFork size={17} style={{ color: "#22c55e" }} />
          <h1 className="text-white font-semibold text-xl">Impact Trace</h1>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "#a3a3a3" }}>
          See everything an event <span style={{ color: "#d4d4d4" }}>caused</span> — the downstream
          chain of actions it led to. The mirror of Causal Trace, which walks upstream to the origin.
        </p>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="mb-6">
        <label
          htmlFor="impact-event-id"
          className="block text-xs font-medium mb-1.5"
          style={{ color: "#d4d4d4" }}
        >
          Event ID
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="impact-event-id"
            value={eventIdInput}
            onChange={(e) => setEventIdInput(e.target.value)}
            placeholder="5cdb3f8c-3a85-46df-8034-184fb89a66a8"
            autoFocus
            spellCheck={false}
            className="flex-1 rounded-lg px-3.5 py-2.5 text-sm font-mono text-white outline-none transition"
            style={{ background: "#0d0d0d", border: "1px solid #262626" }}
            onFocus={(e) => (e.target.style.borderColor = "#22c55e")}
            onBlur={(e) => (e.target.style.borderColor = "#262626")}
          />
          <button
            type="submit"
            disabled={loading || !eventIdInput.trim()}
            className="rounded-lg px-6 py-2.5 text-sm font-medium text-black disabled:opacity-40 transition shrink-0"
            style={{ background: "#22c55e" }}
          >
            {loading ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Trace"}
          </button>
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

      {loading && !tree && (
        <div className="flex items-center gap-2 text-sm py-8" style={{ color: "#a3a3a3" }}>
          <Loader2 size={14} className="animate-spin" />
          Walking the downstream chain…
        </div>
      )}

      {tree && nodes.length > 0 && (
        <>
          {/* Summary */}
          <div
            className="rounded-xl p-5"
            style={{ background: "#111", border: `1px solid ${errorCount ? "#3a1f1f" : "#1f2a1f"}` }}
          >
            <div className="flex items-center gap-2 mb-2.5">
              <GitFork size={15} style={{ color: errorCount ? "#f87171" : "#22c55e" }} />
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: errorCount ? "#f87171" : "#22c55e" }}
              >
                Downstream impact
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "#e5e5e5" }}>
              {nodes.length === 1 ? (
                <>
                  This event has{" "}
                  <span style={{ color: "#fff" }}>no downstream events</span> — nothing was caused by
                  it (yet).
                </>
              ) : (
                <>
                  This event led to{" "}
                  <span style={{ color: "#fff" }}>
                    {nodes.length - 1} downstream event{nodes.length - 1 !== 1 ? "s" : ""}
                  </span>
                  {errorCount > 0 ? (
                    <>
                      , including{" "}
                      <span style={{ color: "#f87171" }}>
                        {errorCount} error{errorCount !== 1 ? "s" : ""}
                      </span>
                      .
                    </>
                  ) : (
                    <> with no errors.</>
                  )}
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 text-xs" style={{ color: "#a3a3a3" }}>
              <span>
                <span style={{ color: "#666" }}>events</span> {nodes.length}
              </span>
              <span>
                <span style={{ color: "#666" }}>span</span> {fmtSpan(span)}
              </span>
              <span>
                <span style={{ color: "#666" }}>agent</span>{" "}
                <span className="font-mono" style={{ color: "#d4d4d4" }}>
                  {nodes[0].agent}
                </span>
              </span>
            </div>
          </div>

          {/* Tree */}
          <div className="mt-5 space-y-2">
            {nodes.map((n) => (
              <ImpactRow
                key={n.event_id}
                node={n}
                isRoot={n.depth === 0}
                isError={isErrorEvent(n.event)}
                expanded={expanded.has(n.event_id)}
                copiedKey={copiedKey}
                onToggle={() => toggle(n.event_id)}
                onCopy={copyText}
                onTraceFrom={() => traceFrom(n.event_id)}
              />
            ))}
          </div>
        </>
      )}

      {!tree && !loading && !error && (
        <div
          className="text-center py-16 px-6 rounded-xl text-sm"
          style={{ background: "#0d0d0d", border: "1px dashed #262626", color: "#a3a3a3" }}
        >
          Enter an event ID above to see everything it caused downstream.
        </div>
      )}
    </div>
  );
}

function ImpactRow({
  node,
  isRoot,
  isError,
  expanded,
  copiedKey,
  onToggle,
  onCopy,
  onTraceFrom,
}: {
  node: ImpactNode;
  isRoot: boolean;
  isError: boolean;
  expanded: boolean;
  copiedKey: string | null;
  onToggle: () => void;
  onCopy: (text: string, key: string) => void;
  onTraceFrom: () => void;
}) {
  const idKey = `id-${node.event_id}`;
  const jsonKey = `json-${node.event_id}`;
  const summary = summarizeData(node.data);
  const accent = isError ? "#f87171" : isRoot ? "#22c55e" : "#3f3f46";
  const border = isError ? "#3a1f1f" : isRoot ? "#1f2a1f" : "#1f1f1f";

  return (
    <div className="flex gap-2" style={{ marginLeft: Math.min(node.depth, 8) * 22 }}>
      {/* depth connector */}
      {node.depth > 0 && (
        <div className="shrink-0 flex items-start pt-4" style={{ color: "#3f3f46" }}>
          <ArrowDownRight size={14} />
        </div>
      )}
      <div
        className="rounded-xl flex-1 min-w-0"
        style={{ background: "#111", border: `1px solid ${border}` }}
      >
        <button onClick={onToggle} className="w-full text-left px-4 py-3" aria-expanded={expanded}>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="flex items-center justify-center rounded-full text-[10px] font-mono font-semibold shrink-0"
              style={{ width: 18, height: 18, border: `1px solid ${accent}`, color: accent === "#3f3f46" ? "#a3a3a3" : accent }}
            >
              {node.depth}
            </span>
            <span
              className="text-sm font-mono font-medium truncate"
              style={{ color: isError ? "#f87171" : "#f5f5f5" }}
            >
              {node.event}
            </span>
            {isRoot && (
              <span
                className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded shrink-0"
                style={{ background: "#14241a", color: "#22c55e" }}
              >
                <Crosshair size={9} /> this event
              </span>
            )}
            {isError && (
              <span
                className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded shrink-0"
                style={{ background: "#2a1414", color: "#f87171" }}
              >
                <AlertCircle size={9} /> Error
              </span>
            )}
            <span className="text-xs font-mono ml-auto" style={{ color: "#737373" }}>
              {fmtAbs(node.timestamp)}
            </span>
          </div>
          {summary && (
            <div className="text-xs mt-1.5 truncate" style={{ color: isError ? "#fca5a5" : "#a3a3a3" }}>
              {summary}
            </div>
          )}
          <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: "#737373" }}>
            <span className="font-mono truncate">
              {node.agent} · seq {node.sequence_no}
            </span>
            <span className="flex items-center gap-0.5 ml-auto shrink-0" style={{ color: "#a3a3a3" }}>
              {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              Details
            </span>
          </div>
        </button>

        {expanded && (
          <div className="px-4 pb-4" style={{ borderTop: "1px solid #1a1a1a" }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pt-3 mb-3 text-xs">
              <div className="flex items-start gap-2">
                <span className="font-mono shrink-0" style={{ color: "#666", minWidth: 84 }}>
                  event_id
                </span>
                <span className="font-mono break-all" style={{ color: "#d4d4d4" }}>
                  {node.event_id}
                </span>
                <button onClick={() => onCopy(node.event_id, idKey)} className="shrink-0" style={{ color: "#666" }}>
                  {copiedKey === idKey ? <Check size={11} style={{ color: "#22c55e" }} /> : <Copy size={11} />}
                </button>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono shrink-0" style={{ color: "#666", minWidth: 84 }}>
                  parent_id
                </span>
                <span className="font-mono break-all" style={{ color: "#d4d4d4" }}>
                  {node.parent_id ?? "— (root, no parent)"}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono shrink-0" style={{ color: "#666", minWidth: 84 }}>
                  session_id
                </span>
                <span className="font-mono break-all" style={{ color: "#d4d4d4" }}>
                  {node.session_id ?? "—"}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono shrink-0" style={{ color: "#666", minWidth: 84 }}>
                  depth
                </span>
                <span className="font-mono" style={{ color: "#d4d4d4" }}>
                  {node.depth}
                </span>
              </div>
            </div>
            <pre
              className="text-xs font-mono rounded-lg p-3 overflow-auto"
              style={{ background: "#0a0a0a", color: "#d4d4d4", maxHeight: 320 }}
            >
              {JSON.stringify(node.data ?? {}, null, 2)}
            </pre>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button
                onClick={() => onCopy(JSON.stringify(node, null, 2), jsonKey)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition"
                style={{ background: "#1a1a1a", border: "1px solid #262626", color: copiedKey === jsonKey ? "#22c55e" : "#d4d4d4" }}
              >
                {copiedKey === jsonKey ? <Check size={12} /> : <Copy size={12} />}
                {copiedKey === jsonKey ? "Copied" : "Copy event JSON"}
              </button>
              {!isRoot && (
                <button
                  onClick={onTraceFrom}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition ml-auto"
                  style={{ background: "#14241a", border: "1px solid #1f3a24", color: "#22c55e" }}
                >
                  Trace impact from here
                  <ArrowDownRight size={12} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
