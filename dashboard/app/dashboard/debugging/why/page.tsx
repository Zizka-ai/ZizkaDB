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
} from "lucide-react";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Always request the deepest lineage the API allows, so the user never has to
// think about a "depth" knob — the full story is always captured.
const MAX_DEPTH = 50;

function isErrorEvent(eventType: string): boolean {
  const t = eventType.toLowerCase();
  return t.includes("error") || t.includes("fail");
}

function firstString(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
}

function formatDelta(ms: number): string {
  if (ms < 1000) return `+${Math.max(0, Math.round(ms))}ms`;
  if (ms < 60_000) return `+${(ms / 1000).toFixed(1)}s`;
  return `+${(ms / 60_000).toFixed(1)}m`;
}

function formatSpan(ms: number): string {
  if (ms < 1000) return `${Math.max(0, Math.round(ms))}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

export default function WhyPage() {
  return (
    <Suspense fallback={<WhyFallback />}>
      <WhyPageInner />
    </Suspense>
  );
}

function WhyFallback() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <p style={{ color: "#e5e5e5" }}>Loading…</p>
    </div>
  );
}

function WhyPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlEventId = searchParams.get("event_id") ?? "";

  const [eventIdInput, setEventIdInput] = useState(urlEventId);
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
      setError("That doesn't look like a valid event ID (expected a UUID).");
      setChain(null);
      return;
    }

    (async () => {
      setLoading(true);
      setError("");
      try {
        const token = requireAuth();
        const result = await getWhyChain(token, trimmed, MAX_DEPTH);
        if (cancelled) return;
        setChain(result);
        // Open the payloads that matter for root-causing by default: every
        // error/fail step plus the event the user searched. Clean steps stay
        // collapsed so the story reads top-to-bottom without scrolling walls.
        const openByDefault = new Set<string>();
        for (const e of result.chain) {
          if (isErrorEvent(e.event)) openByDefault.add(e.event_id);
        }
        if (result.chain.length > 0) {
          openByDefault.add(result.chain[result.chain.length - 1].event_id);
        }
        setExpanded(openByDefault);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to load causal chain.",
        );
        setChain(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [urlEventId]);

  const loadedIds = useMemo(
    () => new Set((chain?.chain ?? []).map((e) => e.event_id)),
    [chain],
  );

  // The root cause is the earliest (lowest in the chain) error/fail event.
  // -1 means the chain contains no error at all.
  const rootCauseIndex = useMemo(() => {
    if (!chain) return -1;
    return chain.chain.findIndex((e) => isErrorEvent(e.event));
  }, [chain]);

  function navigateTo(eventId: string) {
    const params = new URLSearchParams({ event_id: eventId });
    router.push(`/dashboard/debugging/why?${params.toString()}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigateTo(eventIdInput.trim());
  }

  function traceEvent(eventId: string) {
    setEventIdInput(eventId);
    navigateTo(eventId);
  }

  function jumpToNode(eventId: string) {
    const el = document.getElementById(`why-node-${eventId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlighted(eventId);
    setTimeout(() => setHighlighted((h) => (h === eventId ? null : h)), 1500);
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
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <GitBranch size={16} style={{ color: "#22c55e" }} />
          <h1 className="text-white font-semibold text-xl">Why — root cause</h1>
        </div>
        <p className="text-sm" style={{ color: "#e5e5e5" }}>
          Paste an error&apos;s event ID. Every event records the{" "}
          <span className="font-mono" style={{ color: "#a3a3a3" }}>
            parent_id
          </span>{" "}
          of what caused it, so the trace walks that chain back to where it all
          started — then tells the story from the beginning down to the failure.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 mb-6">
        <input
          value={eventIdInput}
          onChange={(e) => setEventIdInput(e.target.value)}
          placeholder="Error event ID (e.g. 5cdb3f8c-3a85-46df-8034-184fb89a66a8)"
          autoFocus
          className="flex-1 rounded-xl px-4 py-3 text-sm font-mono text-white outline-none transition"
          style={{ background: "#111", border: "1px solid #1f1f1f" }}
          onFocus={(e) => (e.target.style.borderColor = "#22c55e")}
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
      </form>

      {error && (
        <div
          className="flex items-start gap-2 rounded-xl px-4 py-3 mb-6 text-sm"
          style={{
            background: "#2a1a1a",
            border: "1px solid #3a1f1f",
            color: "#f87171",
          }}
        >
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {chain && chain.chain.length > 0 && (
        <>
          <StorySummary
            chain={chain}
            rootCauseIndex={rootCauseIndex}
            onCopyLink={() => copyText(window.location.href, "share-link")}
            onCopyChain={() =>
              copyText(JSON.stringify(chain.chain, null, 2), "chain-json")
            }
            copiedKey={copiedKey}
          />

          <div className="mt-6">
            {chain.chain.map((event, i) => {
              const prev = i > 0 ? chain.chain[i - 1] : null;
              const deltaMs = prev
                ? new Date(event.timestamp).getTime() -
                  new Date(prev.timestamp).getTime()
                : 0;
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
                  onTrace={() => traceEvent(event.event_id)}
                  onJumpToParent={() =>
                    event.parent_id && jumpToNode(event.parent_id)
                  }
                />
              );
            })}
          </div>
        </>
      )}

      {!chain && !loading && !error && (
        <div className="text-center py-16 text-sm" style={{ color: "#e5e5e5" }}>
          Enter an error event ID above to trace its root cause.
        </div>
      )}
    </div>
  );
}

function StorySummary({
  chain,
  rootCauseIndex,
  onCopyLink,
  onCopyChain,
  copiedKey,
}: {
  chain: WhyChain;
  rootCauseIndex: number;
  onCopyLink: () => void;
  onCopyChain: () => void;
  copiedKey: string | null;
}) {
  const events = chain.chain;
  const origin = events[0];
  const total = events.length;
  const rootCause = rootCauseIndex >= 0 ? events[rootCauseIndex] : null;
  const parentLinks = total - 1;

  const spanMs =
    new Date(events[total - 1].timestamp).getTime() -
    new Date(origin.timestamp).getTime();

  const errorMsg = rootCause
    ? firstString(rootCause.data?.error, rootCause.data?.message)
    : null;

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "#111",
        border: `1px solid ${rootCause ? "#3a1f1f" : "#1f2a1f"}`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        {rootCause ? (
          <Target size={15} style={{ color: "#f87171" }} />
        ) : (
          <Flag size={15} style={{ color: "#22c55e" }} />
        )}
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: rootCause ? "#f87171" : "#22c55e" }}
        >
          {rootCause ? "Root cause" : "No error detected"}
        </span>
      </div>

      {/* Narrated story line */}
      <p className="text-sm leading-relaxed" style={{ color: "#e5e5e5" }}>
        This flow began with{" "}
        <span className="font-mono" style={{ color: "#fff" }}>
          {origin.event}
        </span>{" "}
        and ran {total} step{total !== 1 ? "s" : ""}
        {rootCause ? (
          <>
            , failing at step {rootCauseIndex + 1} —{" "}
            <span className="font-mono" style={{ color: "#f87171" }}>
              {rootCause.event}
            </span>
            {errorMsg ? <>: {errorMsg}</> : null}.
          </>
        ) : (
          <> with no errors detected in the chain.</>
        )}
      </p>

      {/* At-a-glance stats */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-xs" style={{ color: "#a3a3a3" }}>
        <span>
          <span style={{ color: "#666" }}>steps:</span> {total}
        </span>
        <span>
          <span style={{ color: "#666" }}>span:</span> {formatSpan(spanMs)}
        </span>
        <span>
          <span style={{ color: "#666" }}>agent:</span>{" "}
          <span className="font-mono">{origin.agent}</span>
        </span>
        {origin.session_id && (
          <span>
            <span style={{ color: "#666" }}>session:</span>{" "}
            <span className="font-mono">{origin.session_id}</span>
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 mt-4">
        <span className="text-xs" style={{ color: "#666" }}>
          Traced {parentLinks} parent link{parentLinks !== 1 ? "s" : ""} from the
          event you entered.
        </span>
        <div className="flex gap-2 shrink-0">
          <CopyButton
            label="Copy link"
            onClick={onCopyLink}
            copied={copiedKey === "share-link"}
          />
          <CopyButton
            label="Copy chain JSON"
            onClick={onCopyChain}
            copied={copiedKey === "chain-json"}
          />
        </div>
      </div>
    </div>
  );
}

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
  deltaMs: number;
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

  const accent = isRootCause
    ? "#f87171"
    : isError
      ? "#f87171"
      : isOrigin
        ? "#22c55e"
        : "#2a2a2a";

  return (
    <div className="flex gap-3">
      {/* Timeline rail: step number dot + connector line to the next step */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className="flex items-center justify-center rounded-full text-xs font-mono font-semibold"
          style={{
            width: 26,
            height: 26,
            background: "#0a0a0a",
            border: `1px solid ${accent}`,
            color: accent === "#2a2a2a" ? "#e5e5e5" : accent,
          }}
        >
          {index + 1}
        </div>
        {!isLast && (
          <div className="w-px flex-1 my-1" style={{ background: "#2a2a2a", minHeight: 24 }} />
        )}
      </div>

      {/* Step content */}
      <div
        id={`why-node-${event.event_id}`}
        className="rounded-xl p-4 mb-3 flex-1 min-w-0 transition"
        style={{
          background: "#111",
          border: `1px solid ${
            isHighlighted
              ? "#22c55e"
              : isRootCause || isError
                ? "#3a1f1f"
                : isOrigin
                  ? "#1f2a1f"
                  : "#1f1f1f"
          }`,
        }}
      >
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span
            className="text-sm font-mono font-medium px-2 py-0.5 rounded"
            style={{ background: "#1a1a1a", color: "#e5e5e5" }}
          >
            {event.event}
          </span>
          {isOrigin && <Badge color="#22c55e" background="#1a2a1a" label="Origin" icon={<Flag size={10} />} />}
          {isRootCause && (
            <Badge color="#f87171" background="#2a1a1a" label="Root cause" icon={<Target size={10} />} />
          )}
          {isError && (
            <Badge color="#f87171" background="#2a1a1a" label="Error" icon={<AlertCircle size={10} />} />
          )}
          {isSearched && (
            <Badge color="#a3a3a3" background="#1a1a1a" label="You searched this" />
          )}
          <span className="text-xs font-mono ml-auto" style={{ color: "#e5e5e5" }}>
            {showDelta && (
              <span style={{ color: "#666" }} className="mr-2">
                {formatDelta(deltaMs)}
              </span>
            )}
            {format(new Date(event.timestamp), "yyyy-MM-dd HH:mm:ss.SSS")}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 mb-3">
          <FieldRow label="agent" value={event.agent} />
          <FieldRow label="sequence_no" value={String(event.sequence_no)} />
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
        </div>

        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-1 text-xs transition"
            style={{ color: "#e5e5e5" }}
          >
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            data
          </button>
          <CopyButton
            label="Copy event JSON"
            onClick={() => onCopy(JSON.stringify(event, null, 2), jsonKey)}
            copied={copiedKey === jsonKey}
          />
          {!isOrigin && (
            <button
              onClick={onTrace}
              className="flex items-center gap-1 text-xs ml-auto transition"
              style={{ color: "#22c55e" }}
            >
              Trace this instead
              <ArrowUpRight size={12} />
            </button>
          )}
        </div>

        {isExpanded && (
          <pre
            className="text-xs font-mono rounded-lg p-3 overflow-x-auto"
            style={{ background: "#0a0a0a", color: "#e5e5e5" }}
          >
            {JSON.stringify(event.data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

function CopyButton({
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
      style={{
        background: "#1a1a1a",
        border: "1px solid #2a2a2a",
        color: copied ? "#22c55e" : "#e5e5e5",
      }}
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
      className="flex items-center gap-1 text-xs px-2 py-0.5 rounded"
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
}: {
  label: string;
  value: string;
  copyKey?: string;
  copiedKey?: string | null;
  onCopy?: () => void;
  onJump?: () => void;
}) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="font-mono shrink-0" style={{ color: "#666", minWidth: 90 }}>
        {label}
      </span>
      {onJump ? (
        <button
          onClick={onJump}
          className="font-mono break-all text-left underline decoration-dotted"
          style={{ color: "#e5e5e5" }}
        >
          {value}
        </button>
      ) : (
        <span className="font-mono break-all" style={{ color: "#e5e5e5" }}>
          {value}
        </span>
      )}
      {onCopy && (
        <button onClick={onCopy} className="shrink-0" style={{ color: "#666" }}>
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
