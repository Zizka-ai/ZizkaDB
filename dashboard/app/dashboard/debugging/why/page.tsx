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
} from "lucide-react";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isErrorEvent(eventType: string): boolean {
  const t = eventType.toLowerCase();
  return t.includes("error") || t.includes("fail");
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
  const urlDepth = searchParams.get("depth") ?? "";

  const [eventIdInput, setEventIdInput] = useState(urlEventId);
  const [depthInput, setDepthInput] = useState(urlDepth);
  const [chain, setChain] = useState<WhyChain | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [highlighted, setHighlighted] = useState<string | null>(null);

  // Single source of truth: the URL. Every trace action (manual submit, deep
  // link, "trace this instead") navigates to a new ?event_id=&depth= and this
  // effect reacts — so there's exactly one fetch path, not several.
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
        const depthNum = urlDepth ? Number(urlDepth) : undefined;
        const result = await getWhyChain(
          token,
          trimmed,
          depthNum && depthNum > 0 ? depthNum : undefined,
        );
        if (cancelled) return;
        setChain(result);
        if (result.chain.length > 0) {
          setExpanded(
            new Set([
              result.chain[0].event_id,
              result.chain[result.chain.length - 1].event_id,
            ]),
          );
        }
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
  }, [urlEventId, urlDepth]);

  const loadedIds = useMemo(
    () => new Set((chain?.chain ?? []).map((e) => e.event_id)),
    [chain],
  );

  function navigateTo(eventId: string, depth?: string) {
    const params = new URLSearchParams();
    params.set("event_id", eventId);
    if (depth) params.set("depth", depth);
    router.push(`/dashboard/debugging/why?${params.toString()}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigateTo(eventIdInput.trim(), depthInput.trim() || undefined);
  }

  function traceEvent(eventId: string) {
    setEventIdInput(eventId);
    navigateTo(eventId, depthInput.trim() || undefined);
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
          <h1 className="text-white font-semibold text-xl">Why</h1>
        </div>
        <p className="text-sm" style={{ color: "#e5e5e5" }}>
          Paste an event ID to see its full causal chain — from the event
          that started it all, down to the event you're debugging. No parent
          ID needed; the chain is walked for you.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row gap-2 mb-6"
      >
        <input
          value={eventIdInput}
          onChange={(e) => setEventIdInput(e.target.value)}
          placeholder="Event ID (e.g. e37c84a6-0764-4038-a260-b28b3466eaf6)"
          autoFocus
          className="flex-1 rounded-xl px-4 py-3 text-sm font-mono text-white outline-none transition"
          style={{ background: "#111", border: "1px solid #1f1f1f" }}
          onFocus={(e) => (e.target.style.borderColor = "#22c55e")}
          onBlur={(e) => (e.target.style.borderColor = "#1f1f1f")}
        />
        <input
          value={depthInput}
          onChange={(e) => setDepthInput(e.target.value.replace(/\D/g, ""))}
          placeholder="Depth (10)"
          className="w-full sm:w-28 rounded-xl px-4 py-3 text-sm font-mono text-white outline-none transition"
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
            "Trace"
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
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 mb-4"
            style={{ background: "#111", border: "1px solid #1f1f1f" }}
          >
            <div className="text-xs font-mono" style={{ color: "#e5e5e5" }}>
              Searched{" "}
              <span style={{ color: "#fff" }}>{chain.event_id}</span> ·{" "}
              {chain.chain_length} event
              {chain.chain_length !== 1 ? "s" : ""} in chain
            </div>
            <div className="flex gap-2">
              <CopyButton
                label="Copy link"
                onClick={() =>
                  copyText(window.location.href, "share-link")
                }
                copied={copiedKey === "share-link"}
              />
              <CopyButton
                label="Copy chain JSON"
                onClick={() =>
                  copyText(JSON.stringify(chain.chain, null, 2), "chain-json")
                }
                copied={copiedKey === "chain-json"}
              />
            </div>
          </div>

          <div className="space-y-3">
            {chain.chain.map((event, i) => (
              <EventCard
                key={event.event_id}
                event={event}
                isOrigin={i === 0}
                isSearched={i === chain.chain.length - 1}
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
            ))}
          </div>
        </>
      )}

      {!chain && !loading && !error && (
        <div
          className="text-center py-16 text-sm"
          style={{ color: "#e5e5e5" }}
        >
          Enter an event ID above to trace its causal chain.
        </div>
      )}
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

function EventCard({
  event,
  isOrigin,
  isSearched,
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
  isOrigin: boolean;
  isSearched: boolean;
  isExpanded: boolean;
  isHighlighted: boolean;
  copiedKey: string | null;
  parentInChain: boolean;
  onToggleExpand: () => void;
  onCopy: (text: string, key: string) => void;
  onTrace: () => void;
  onJumpToParent: () => void;
}) {
  const isError = isErrorEvent(event.event);
  const idKey = `id-${event.event_id}`;
  const jsonKey = `json-${event.event_id}`;
  const parentKey = `parent-${event.event_id}`;
  const sessionKey = `session-${event.event_id}`;

  return (
    <div
      id={`why-node-${event.event_id}`}
      className="rounded-xl p-4 transition"
      style={{
        background: "#111",
        border: `1px solid ${
          isHighlighted
            ? "#22c55e"
            : isOrigin
              ? "#1a2a1a"
              : isSearched
                ? "#2a1a1a"
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
        {isOrigin && (
          <Badge color="#22c55e" background="#1a2a1a" label="Origin" />
        )}
        {isSearched && (
          <Badge
            color="#f87171"
            background="#2a1a1a"
            label="You searched this event"
          />
        )}
        {isError && (
          <Badge color="#f87171" background="#2a1a1a" label="Error" icon />
        )}
        <span className="text-xs font-mono ml-auto" style={{ color: "#e5e5e5" }}>
          {format(new Date(event.timestamp), "yyyy-MM-dd HH:mm:ss.SSS")}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 mb-3">
        <FieldRow
          label="agent"
          value={event.agent}
        />
        <FieldRow
          label="sequence_no"
          value={String(event.sequence_no)}
        />
        <FieldRow
          label="event_id"
          value={event.event_id}
          copyKey={idKey}
          copiedKey={copiedKey}
          onCopy={() => onCopy(event.event_id, idKey)}
        />
        <FieldRow
          label="parent_id"
          value={event.parent_id ?? "—"}
          copyKey={event.parent_id ? parentKey : undefined}
          copiedKey={copiedKey}
          onCopy={
            event.parent_id
              ? () => onCopy(event.parent_id as string, parentKey)
              : undefined
          }
          onJump={
            event.parent_id && parentInChain ? onJumpToParent : undefined
          }
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
          {isExpanded ? (
            <ChevronDown size={12} />
          ) : (
            <ChevronRight size={12} />
          )}
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
  icon?: boolean;
}) {
  return (
    <span
      className="flex items-center gap-1 text-xs px-2 py-0.5 rounded"
      style={{ background, color }}
    >
      {icon && <AlertCircle size={10} />}
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
      <span
        className="font-mono shrink-0"
        style={{ color: "#666", minWidth: 90 }}
      >
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
