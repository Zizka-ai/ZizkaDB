"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getWhyChain, type WhyChain, type AgentEvent } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { format } from "date-fns";
import {
  GitBranch,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  ArrowUpRight,
  Loader2,
  Target,
  Flag,
  Clock,
} from "lucide-react";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Always request the deepest lineage the API allows, so the user never has to
// think about a "depth" knob — the full story is always captured.
const MAX_DEPTH = 50;

// ── helpers ───────────────────────────────────────────────────────────────────

function isErrorEvent(eventType: string): boolean {
  const t = (eventType || "").toLowerCase();
  return t.includes("error") || t.includes("fail");
}

function firstString(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
}

function validDate(ts: string): Date | null {
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtAbs(ts: string): string {
  const d = validDate(ts);
  return d ? format(d, "yyyy-MM-dd HH:mm:ss.SSS") : ts || "unknown time";
}

function fmtDelta(ms: number | null): string | null {
  if (ms === null || ms < 0) return null;
  if (ms < 1000) return `+${Math.round(ms)}ms`;
  if (ms < 60_000) return `+${(ms / 1000).toFixed(1)}s`;
  return `+${(ms / 60_000).toFixed(1)}m`;
}

function fmtSpan(ms: number | null): string {
  if (ms === null || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3_600_000) return `${(ms / 60_000).toFixed(1)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

function previewValue(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "string") return v.length > 48 ? v.slice(0, 48) + "…" : v;
  if (Array.isArray(v)) return `[${v.length} item${v.length === 1 ? "" : "s"}]`;
  if (typeof v === "object") return "{…}";
  return String(v);
}

// One-line human summary of an event's payload — the "what happened".
function summarizeData(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const rec = data as Record<string, unknown>;
  const errMsg = firstString(rec.error, rec.message);
  if (errMsg) return errMsg;
  const entries = Object.entries(rec);
  if (entries.length === 0) return "";
  return entries
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${previewValue(v)}`)
    .join("  ·  ");
}

// Map raw fetch errors to friendly, actionable copy.
function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const m = msg.toLowerCase();
  if (m.includes("event not found") || m.includes("not found")) {
    return "No event found with that ID in this workspace. Double-check the ID and try again.";
  }
  if (
    m.includes("failed to fetch") ||
    m.includes("networkerror") ||
    m.includes("load failed")
  ) {
    return "Couldn't reach the server. Check that the ZizkaDB API is running, then retry.";
  }
  if (m.includes("invalid token") || m.includes("401") || m.includes("unauthorized")) {
    return "Your session expired. Please sign in again.";
  }
  if (m.includes("does not match")) {
    return "The Parent ID doesn't match this event's actual parent. Double-check you're tracing the right event — or leave Parent ID blank for a root/origin event (one with no parent).";
  }
  if (m.includes("parent_id is not a valid uuid")) {
    return "The Parent ID isn't a valid UUID. Paste the parent_id exactly, or leave it blank.";
  }
  return msg || "Something went wrong loading the causal chain.";
}

// ── page ────────────────────────────────────────────────────────────────────────

export default function WhyPage() {
  return (
    <Suspense fallback={<WhyFallback />}>
      <WhyPageInner />
    </Suspense>
  );
}

function WhyFallback() {
  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto">
      <p style={{ color: "#a3a3a3" }}>Loading…</p>
    </div>
  );
}

function WhyPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlEventId = searchParams.get("event_id") ?? "";
  const urlParentId = searchParams.get("parent_id") ?? "";

  const [eventIdInput, setEventIdInput] = useState(urlEventId);
  const [parentIdInput, setParentIdInput] = useState(urlParentId);
  const [chain, setChain] = useState<WhyChain | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [highlighted, setHighlighted] = useState<string | null>(null);

  // The URL is the single source of truth: every trace action (manual submit,
  // deep link, "trace this instead") navigates to a new ?event_id= and this
  // effect reacts — so there is exactly one fetch path.
  useEffect(() => {
    let cancelled = false;

    if (!urlEventId) {
      setChain(null);
      setError("");
      return;
    }

    const trimmed = urlEventId.trim();
    if (!UUID_RE.test(trimmed)) {
      setError(
        "That doesn't look like a valid event ID. It should be a UUID like 5cdb3f8c-3a85-46df-8034-184fb89a66a8.",
      );
      setChain(null);
      return;
    }

    const parentTrimmed = urlParentId.trim();
    if (parentTrimmed && !UUID_RE.test(parentTrimmed)) {
      setError(
        "The Parent ID isn't a valid UUID. Paste the parent_id exactly, or leave it blank.",
      );
      setChain(null);
      return;
    }

    (async () => {
      setLoading(true);
      setError("");
      try {
        const token = requireAuth();
        const result = await getWhyChain(
          token,
          trimmed,
          MAX_DEPTH,
          parentTrimmed || undefined,
        );
        if (cancelled) return;
        setChain(result);
        // Open the payloads that matter for root-causing by default: every
        // error/fail step plus the event the user searched. Clean steps stay
        // collapsed so the story reads top-to-bottom.
        const open = new Set<string>();
        for (const e of result.chain) {
          if (isErrorEvent(e.event)) open.add(e.event_id);
        }
        if (result.chain.length > 0) {
          open.add(result.chain[result.chain.length - 1].event_id);
        }
        setExpanded(open);
      } catch (err) {
        if (cancelled) return;
        setError(friendlyError(err));
        setChain(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [urlEventId, urlParentId]);

  const loadedIds = useMemo(
    () => new Set((chain?.chain ?? []).map((e) => e.event_id)),
    [chain],
  );

  // Root cause = the earliest (lowest-in-chain) error/fail event. -1 = no error.
  const rootCauseIndex = useMemo(() => {
    if (!chain) return -1;
    return chain.chain.findIndex((e) => isErrorEvent(e.event));
  }, [chain]);

  function navigateTo(eventId: string, parentId?: string) {
    const params = new URLSearchParams({ event_id: eventId });
    if (parentId) params.set("parent_id", parentId);
    router.push(`/dashboard/debugging/why?${params.toString()}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = eventIdInput.trim();
    if (v) navigateTo(v, parentIdInput.trim() || undefined);
  }

  // Re-trace from a node. Carries that node's own parent_id so the integrity
  // guard applies automatically; origin nodes (no parent) re-trace unguarded.
  function traceEvent(eventId: string, parentId?: string) {
    setEventIdInput(eventId);
    setParentIdInput(parentId ?? "");
    navigateTo(eventId, parentId);
  }

  function jumpToNode(eventId: string) {
    const el = document.getElementById(`why-node-${eventId}`);
    if (!el) return;
    setExpanded((prev) => new Set(prev).add(eventId));
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlighted(eventId);
    setTimeout(() => setHighlighted((h) => (h === eventId ? null : h)), 1600);
  }

  async function copyText(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    } catch {
      // Clipboard unavailable (e.g. non-secure context) — fail silently.
    }
  }

  function toggleExpanded(eventId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  }

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <GitBranch size={17} style={{ color: "#22c55e" }} />
          <h1 className="text-white font-semibold text-xl">Why — root cause</h1>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "#a3a3a3" }}>
          Paste an error&apos;s event ID. Every event records the{" "}
          <span className="font-mono" style={{ color: "#d4d4d4" }}>
            parent_id
          </span>{" "}
          of what caused it, so the trace walks that chain back to where it
          started — then tells the story from the beginning down to the failure.
        </p>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="mb-2">
        <div className="flex flex-col gap-2">
          <input
            value={eventIdInput}
            onChange={(e) => setEventIdInput(e.target.value)}
            placeholder="Error event ID (e.g. 5cdb3f8c-3a85-46df-8034-184fb89a66a8)"
            autoFocus
            spellCheck={false}
            aria-label="Error event ID"
            className="w-full rounded-xl px-4 py-3 text-sm font-mono text-white outline-none transition"
            style={{ background: "#111", border: "1px solid #262626" }}
            onFocus={(e) => (e.target.style.borderColor = "#22c55e")}
            onBlur={(e) => (e.target.style.borderColor = "#262626")}
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={parentIdInput}
              onChange={(e) => setParentIdInput(e.target.value)}
              placeholder="Parent ID — optional integrity check (leave blank for a root event)"
              spellCheck={false}
              aria-label="Parent ID (optional integrity check)"
              className="flex-1 rounded-xl px-4 py-3 text-sm font-mono text-white outline-none transition"
              style={{ background: "#0d0d0d", border: "1px solid #1f1f1f" }}
              onFocus={(e) => (e.target.style.borderColor = "#3f3f46")}
              onBlur={(e) => (e.target.style.borderColor = "#1f1f1f")}
            />
            <button
              type="submit"
              disabled={loading || !eventIdInput.trim()}
              className="rounded-xl px-6 py-3 text-sm font-medium text-black disabled:opacity-40 transition shrink-0"
              style={{ background: "#22c55e" }}
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin mx-auto" />
              ) : (
                "Trace root cause"
              )}
            </button>
          </div>
        </div>
      </form>
      <p className="text-xs mb-6" style={{ color: "#666" }}>
        Parent ID is an optional guard: when set, the trace only runs if it
        matches the event&apos;s real parent (enforced server-side). Your account
        boundary always applies regardless — you can never trace another
        tenant&apos;s events.
      </p>

      {/* Error */}
      {error && (
        <div
          className="flex items-start gap-2.5 rounded-xl px-4 py-3 mb-6 text-sm"
          style={{ background: "#1f1414", border: "1px solid #3a1f1f", color: "#f87171" }}
        >
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !chain && (
        <div className="flex items-center gap-2 text-sm py-8" style={{ color: "#a3a3a3" }}>
          <Loader2 size={14} className="animate-spin" />
          Walking the causal chain…
        </div>
      )}

      {/* Result */}
      {chain && chain.chain.length > 0 && (
        <>
          <StorySummary
            chain={chain}
            rootCauseIndex={rootCauseIndex}
            copiedKey={copiedKey}
            onCopyLink={() => copyText(window.location.href, "share-link")}
            onCopyChain={() =>
              copyText(JSON.stringify(chain.chain, null, 2), "chain-json")
            }
          />

          <div className="mt-5">
            {chain.chain.map((event, i) => {
              const prev = i > 0 ? chain.chain[i - 1] : null;
              const a = prev ? validDate(prev.timestamp) : null;
              const b = validDate(event.timestamp);
              const deltaMs = a && b ? b.getTime() - a.getTime() : null;
              return (
                <StoryStep
                  key={event.event_id}
                  event={event}
                  index={i}
                  total={chain.chain.length}
                  isOrigin={i === 0}
                  isSearched={i === chain.chain.length - 1}
                  isRootCause={i === rootCauseIndex}
                  isError={isErrorEvent(event.event) && i !== rootCauseIndex}
                  deltaMs={deltaMs}
                  showDelta={i > 0}
                  isExpanded={expanded.has(event.event_id)}
                  isHighlighted={highlighted === event.event_id}
                  copiedKey={copiedKey}
                  parentInChain={
                    event.parent_id ? loadedIds.has(event.parent_id) : false
                  }
                  onToggleExpand={() => toggleExpanded(event.event_id)}
                  onCopy={copyText}
                  onTrace={() =>
                    traceEvent(event.event_id, event.parent_id ?? undefined)
                  }
                  onJumpToParent={() =>
                    event.parent_id && jumpToNode(event.parent_id)
                  }
                />
              );
            })}
          </div>
        </>
      )}

      {/* Empty */}
      {!chain && !loading && !error && (
        <div
          className="text-center py-16 px-6 rounded-xl text-sm"
          style={{ background: "#0d0d0d", border: "1px dashed #262626", color: "#a3a3a3" }}
        >
          Enter an error event ID above to trace its root cause and see the full
          story of how it happened.
        </div>
      )}
    </div>
  );
}

// ── summary banner ──────────────────────────────────────────────────────────────

function StorySummary({
  chain,
  rootCauseIndex,
  copiedKey,
  onCopyLink,
  onCopyChain,
}: {
  chain: WhyChain;
  rootCauseIndex: number;
  copiedKey: string | null;
  onCopyLink: () => void;
  onCopyChain: () => void;
}) {
  const events = chain.chain;
  const origin = events[0];
  const last = events[events.length - 1];
  const total = events.length;
  const rootCause = rootCauseIndex >= 0 ? events[rootCauseIndex] : null;
  const parentLinks = total - 1;

  const oDate = validDate(origin.timestamp);
  const lDate = validDate(last.timestamp);
  const spanMs = oDate && lDate ? lDate.getTime() - oDate.getTime() : null;

  const errorMsg = rootCause
    ? firstString(
        (rootCause.data as Record<string, unknown> | null)?.error,
        (rootCause.data as Record<string, unknown> | null)?.message,
      )
    : null;

  const accent = rootCause ? "#f87171" : "#22c55e";

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "#111", border: `1px solid ${rootCause ? "#3a1f1f" : "#1f2a1f"}` }}
    >
      <div className="flex items-center gap-2 mb-2.5">
        {rootCause ? (
          <Target size={15} style={{ color: accent }} />
        ) : (
          <Flag size={15} style={{ color: accent }} />
        )}
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: accent }}
        >
          {rootCause ? "Root cause" : "No error detected"}
        </span>
      </div>

      <p className="text-sm leading-relaxed" style={{ color: "#e5e5e5" }}>
        This flow began with{" "}
        <span className="font-mono px-1 rounded" style={{ background: "#1a1a1a", color: "#fff" }}>
          {origin.event}
        </span>{" "}
        and ran {total} step{total !== 1 ? "s" : ""}
        {rootCause ? (
          <>
            , failing at step {rootCauseIndex + 1} —{" "}
            <span
              className="font-mono px-1 rounded"
              style={{ background: "#2a1414", color: "#f87171" }}
            >
              {rootCause.event}
            </span>
            {errorMsg ? <>: {errorMsg}</> : null}.
          </>
        ) : (
          <> with no errors detected in the chain.</>
        )}
      </p>

      <div
        className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3.5 text-xs"
        style={{ color: "#a3a3a3" }}
      >
        <span className="flex items-center gap-1.5">
          <GitBranch size={12} style={{ color: "#666" }} />
          {total} step{total !== 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock size={12} style={{ color: "#666" }} />
          {fmtSpan(spanMs)}
        </span>
        <span>
          <span style={{ color: "#666" }}>agent</span>{" "}
          <span className="font-mono" style={{ color: "#d4d4d4" }}>
            {origin.agent}
          </span>
        </span>
        {origin.session_id && (
          <span>
            <span style={{ color: "#666" }}>session</span>{" "}
            <span className="font-mono" style={{ color: "#d4d4d4" }}>
              {origin.session_id}
            </span>
          </span>
        )}
      </div>

      <div
        className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3.5"
        style={{ borderTop: "1px solid #1f1f1f" }}
      >
        <span className="text-xs" style={{ color: "#666" }}>
          Traced {parentLinks} parent link{parentLinks !== 1 ? "s" : ""} from the
          event you entered.
        </span>
        <div className="flex gap-2 shrink-0">
          <MiniButton label="Copy link" onClick={onCopyLink} copied={copiedKey === "share-link"} />
          <MiniButton
            label="Copy chain JSON"
            onClick={onCopyChain}
            copied={copiedKey === "chain-json"}
          />
        </div>
      </div>
    </div>
  );
}

// ── one step in the story timeline ───────────────────────────────────────────────

function StoryStep({
  event,
  index,
  total,
  isOrigin,
  isSearched,
  isRootCause,
  isError,
  deltaMs,
  showDelta,
  isExpanded,
  isHighlighted,
  copiedKey,
  parentInChain,
  onToggleExpand,
  onCopy,
  onTrace,
  onJumpToParent,
}: {
  event: AgentEvent;
  index: number;
  total: number;
  isOrigin: boolean;
  isSearched: boolean;
  isRootCause: boolean;
  isError: boolean;
  deltaMs: number | null;
  showDelta: boolean;
  isExpanded: boolean;
  isHighlighted: boolean;
  copiedKey: string | null;
  parentInChain: boolean;
  onToggleExpand: () => void;
  onCopy: (text: string, key: string) => void;
  onTrace: () => void;
  onJumpToParent: () => void;
}) {
  const idKey = `id-${event.event_id}`;
  const jsonKey = `json-${event.event_id}`;
  const parentKey = `parent-${event.event_id}`;
  const sessionKey = `session-${event.event_id}`;
  const isLast = index === total - 1;
  const summary = summarizeData(event.data);
  const delta = fmtDelta(deltaMs);
  const flagged = isRootCause || isError;

  const accent = flagged ? "#f87171" : isOrigin ? "#22c55e" : "#3f3f46";
  const borderColor = isHighlighted
    ? "#22c55e"
    : flagged
      ? "#3a1f1f"
      : isOrigin
        ? "#1f2a1f"
        : "#1f1f1f";

  return (
    <div className="flex gap-3">
      {/* Timeline rail */}
      <div className="flex flex-col items-center shrink-0" style={{ width: 28 }}>
        <div
          className="flex items-center justify-center rounded-full text-xs font-mono font-semibold"
          style={{
            width: 28,
            height: 28,
            background: "#0a0a0a",
            border: `1px solid ${accent}`,
            color: accent === "#3f3f46" ? "#a3a3a3" : accent,
          }}
        >
          {index + 1}
        </div>
        {!isLast && (
          <div className="w-px flex-1 my-1" style={{ background: "#262626", minHeight: 20 }} />
        )}
      </div>

      {/* Card */}
      <div
        id={`why-node-${event.event_id}`}
        className="rounded-xl flex-1 min-w-0 mb-3 transition"
        style={{ background: "#111", border: `1px solid ${borderColor}` }}
      >
        {/* Clickable summary header (whole header toggles details) */}
        <button
          onClick={onToggleExpand}
          className="w-full text-left px-4 py-3.5"
          aria-expanded={isExpanded}
        >
          {/* Row 1: event type + role badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-sm font-mono font-medium truncate"
              style={{ color: flagged ? "#f87171" : "#f5f5f5", maxWidth: "100%" }}
            >
              {event.event}
            </span>
            {isOrigin && <Badge color="#22c55e" background="#14241a" label="Origin" icon={<Flag size={9} />} />}
            {isRootCause && (
              <Badge color="#f87171" background="#2a1414" label="Root cause" icon={<Target size={9} />} />
            )}
            {isError && (
              <Badge color="#f87171" background="#2a1414" label="Error" icon={<AlertCircle size={9} />} />
            )}
            {isSearched && <Badge color="#a3a3a3" background="#1a1a1a" label="You searched this" />}
          </div>

          {/* Row 2: what happened */}
          {summary && (
            <div
              className="text-xs mt-1.5 truncate"
              style={{ color: flagged ? "#fca5a5" : "#a3a3a3" }}
            >
              {summary}
            </div>
          )}

          {/* Row 3: supporting values (always visible) + expand chevron */}
          <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: "#737373" }}>
            <span className="font-mono truncate">
              {event.agent} · seq {event.sequence_no} · {fmtAbs(event.timestamp)}
              {showDelta && delta ? ` · ${delta}` : ""}
            </span>
            <span className="flex items-center gap-0.5 ml-auto shrink-0" style={{ color: "#a3a3a3" }}>
              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              Details
            </span>
          </div>
        </button>

        {/* Expanded details */}
        {isExpanded && (
          <div className="px-4 pb-4" style={{ borderTop: "1px solid #1a1a1a" }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pt-3 mb-3">
              <FieldRow
                label="event_id"
                value={event.event_id}
                copyKey={idKey}
                copiedKey={copiedKey}
                onCopy={() => onCopy(event.event_id, idKey)}
              />
              <FieldRow
                label="parent_id"
                value={event.parent_id ?? "— (origin, no parent)"}
                copyKey={event.parent_id ? parentKey : undefined}
                copiedKey={copiedKey}
                onCopy={
                  event.parent_id
                    ? () => onCopy(event.parent_id as string, parentKey)
                    : undefined
                }
                onJump={event.parent_id && parentInChain ? onJumpToParent : undefined}
                jumpTitle="Jump to the event this was caused by"
              />
              <FieldRow
                label="session_id"
                value={event.session_id ?? "—"}
                copyKey={event.session_id ? sessionKey : undefined}
                copiedKey={copiedKey}
                onCopy={
                  event.session_id
                    ? () => onCopy(event.session_id as string, sessionKey)
                    : undefined
                }
              />
              <FieldRow label="sequence_no" value={String(event.sequence_no)} />
            </div>

            <div className="text-xs mb-1.5" style={{ color: "#666" }}>
              data
            </div>
            <pre
              className="text-xs font-mono rounded-lg p-3 overflow-auto"
              style={{ background: "#0a0a0a", color: "#d4d4d4", maxHeight: 320 }}
            >
              {JSON.stringify(event.data ?? {}, null, 2)}
            </pre>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <MiniButton
                label="Copy event JSON"
                onClick={() => onCopy(JSON.stringify(event, null, 2), jsonKey)}
                copied={copiedKey === jsonKey}
              />
              {!isOrigin && (
                <button
                  onClick={onTrace}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition ml-auto"
                  style={{ background: "#14241a", border: "1px solid #1f3a24", color: "#22c55e" }}
                  title="Re-run the trace starting from this event"
                >
                  Trace from here
                  <ArrowUpRight size={12} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── small shared bits ────────────────────────────────────────────────────────────

function MiniButton({
  label,
  onClick,
  copied,
}: {
  label: string;
  onClick: () => void;
  copied: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition"
      style={{ background: "#1a1a1a", border: "1px solid #262626", color: copied ? "#22c55e" : "#d4d4d4" }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : label}
    </button>
  );
}

function Badge({
  label,
  color,
  background,
  icon,
}: {
  label: string;
  color: string;
  background: string;
  icon?: React.ReactNode;
}) {
  return (
    <span
      className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded shrink-0"
      style={{ background, color }}
    >
      {icon}
      {label}
    </span>
  );
}

function FieldRow({
  label,
  value,
  copyKey,
  copiedKey,
  onCopy,
  onJump,
  jumpTitle,
}: {
  label: string;
  value: string;
  copyKey?: string;
  copiedKey?: string | null;
  onCopy?: () => void;
  onJump?: () => void;
  jumpTitle?: string;
}) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="font-mono shrink-0" style={{ color: "#666", minWidth: 84 }}>
        {label}
      </span>
      {onJump ? (
        <button
          onClick={onJump}
          title={jumpTitle}
          className="font-mono break-all text-left underline decoration-dotted underline-offset-2"
          style={{ color: "#d4d4d4" }}
        >
          {value}
        </button>
      ) : (
        <span className="font-mono break-all" style={{ color: "#d4d4d4" }}>
          {value}
        </span>
      )}
      {onCopy && (
        <button onClick={onCopy} className="shrink-0" style={{ color: "#666" }} title={`Copy ${label}`}>
          {copyKey && copiedKey === copyKey ? (
            <Check size={11} style={{ color: "#22c55e" }} />
          ) : (
            <Copy size={11} />
          )}
        </button>
      )}
    </div>
  );
}
