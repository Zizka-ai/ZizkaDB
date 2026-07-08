"use client";

import { ApiKeyUsage } from "@/components/ApiKeyUsage";
import { useApiKeyQuota } from "@/hooks/useApiKeyQuota";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import {
  createAgentApiKey,
  getAgentApiKeys,
  revokeAgentApiKey,
  sendAgentTestEvent,
  type ApiKey,
} from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { Check, Copy, Key, Plus, Trash2, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function AgentApiKeys({
  agentId,
  onTestSuccess,
}: {
  agentId: string;
  onTestSuccess?: () => void;
}) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const { copied, copy } = useCopyToClipboard();
  const [err, setErr] = useState("");
  const [testBusy, setTestBusy] = useState(false);
  const [testMsg, setTestMsg] = useState("");
  const quota = useApiKeyQuota();

  const load = useCallback(async () => {
    try {
      const token = requireAuth();
      const data = await getAgentApiKeys(token, agentId);
      setKeys(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load API keys");
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate() {
    setCreating(true);
    setErr("");
    try {
      const token = requireAuth();
      const res = await createAgentApiKey(token, agentId);
      setNewKey(res.key);
      await load();
      await quota.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(key: ApiKey) {
    if (
      !window.confirm(
        `Revoke key "${key.name ?? key.prefix}"? Apps using it will stop working.`,
      )
    ) {
      return;
    }
    setRevokingId(key.key_id);
    try {
      const token = requireAuth();
      await revokeAgentApiKey(token, agentId, key.key_id);
      setKeys((prev) => prev.filter((k) => k.key_id !== key.key_id));
      await quota.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to revoke key");
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div
      className="rounded-xl overflow-hidden mb-6"
      style={{ border: "1px solid #1f1f1f" }}
    >
      <div
        className="px-5 py-4 flex items-center justify-between gap-3"
        style={{ background: "#111", borderBottom: "1px solid #1f1f1f" }}
      >
        <div>
          <h2 className="text-sm font-medium text-white">API keys</h2>
          <p className="text-xs mt-0.5" style={{ color: "#e5e5e5" }}>
            Keys for this agent only. Set as{" "}
            <span className="font-mono">ZIZKADB_API_KEY</span> or{" "}
            <span className="font-mono">AGENTDB_API_KEY</span> in your app.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={testBusy}
            onClick={async () => {
              setTestBusy(true);
              setTestMsg("");
              setErr("");
              try {
                const token = requireAuth();
                const res = await sendAgentTestEvent(token, agentId);
                setTestMsg(res.message ?? "Test event sent");
                onTestSuccess?.();
              } catch (e) {
                setErr(e instanceof Error ? e.message : "Test failed");
              } finally {
                setTestBusy(false);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
            style={{
              background: "#1a1a1a",
              color: "#e5e5e5",
              border: "1px solid #2a2a2a",
            }}
          >
            <Zap size={13} style={{ color: "#22c55e" }} />
            {testBusy ? "Sending…" : "Test agent"}
          </button>
          <button
            type="button"
            disabled={creating || quota.at_limit}
            onClick={handleCreate}
            title={
              quota.at_limit
                ? "API key limit reached — upgrade your plan to create more"
                : undefined
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-black disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "#22c55e" }}
          >
            <Plus size={13} />
            {creating ? "Creating…" : "New key"}
          </button>
        </div>
      </div>
      {!quota.unlimited && (
        <div
          className="px-5 py-3"
          style={{ background: "#111", borderBottom: "1px solid #1f1f1f" }}
        >
          <ApiKeyUsage quota={quota} />
        </div>
      )}
      {testMsg && (
        <p
          className="px-5 py-2 text-xs"
          style={{
            color: "#22c55e",
            background: "#111",
            borderBottom: "1px solid #1f1f1f",
          }}
        >
          {testMsg}
        </p>
      )}

      {newKey && (
        <div
          className="px-5 py-4"
          style={{ background: "#0d2010", borderBottom: "1px solid #1f1f1f" }}
        >
          <p className="text-xs font-medium mb-2" style={{ color: "#22c55e" }}>
            New key — copy now, it won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code
              className="flex-1 text-xs font-mono rounded-lg px-3 py-2 truncate"
              style={{ background: "#0a0a0a", color: "#e5e5e5" }}
            >
              {newKey}
            </code>
            <button
              type="button"
              onClick={() => copy(newKey)}
              className="p-2 rounded-lg shrink-0"
              style={{ background: "#1a1a1a" }}
            >
              {copied ? (
                <Check size={14} style={{ color: "#22c55e" }} />
              ) : (
                <Copy size={14} style={{ color: "#e5e5e5" }} />
              )}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setNewKey(null)}
            className="text-xs mt-2"
            style={{ color: "#e5e5e5" }}
          >
            Dismiss
          </button>
        </div>
      )}

      <div style={{ background: "#111" }}>
        {loading ? (
          <div className="p-5 space-y-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-10 rounded animate-pulse"
                style={{ background: "#1a1a1a" }}
              />
            ))}
          </div>
        ) : keys.length === 0 ? (
          <div className="p-6 text-center text-sm" style={{ color: "#e5e5e5" }}>
            No keys yet. Create one to connect your app to this agent.
          </div>
        ) : (
          keys.map((key, i) => (
            <div
              key={key.key_id}
              className="flex items-center justify-between px-5 py-4"
              style={{ borderTop: i > 0 ? "1px solid #1a1a1a" : "none" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Key
                  size={14}
                  style={{ color: "#e5e5e5" }}
                  className="shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-sm text-white truncate">
                    {key.name ?? "Unnamed"}
                  </div>
                  <div
                    className="text-xs font-mono mt-0.5"
                    style={{ color: "#e5e5e5" }}
                  >
                    {key.prefix}...
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs" style={{ color: "#e5e5e5" }}>
                  {key.last_used
                    ? `Used ${new Date(key.last_used).toLocaleDateString()}`
                    : "Never used"}
                </span>
                <button
                  type="button"
                  disabled={revokingId === key.key_id}
                  onClick={() => handleRevoke(key)}
                  className="p-1.5 rounded-lg disabled:opacity-40"
                  style={{ background: "#1a1a1a" }}
                  title="Revoke key"
                >
                  <Trash2 size={14} style={{ color: "#f87171" }} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      {err && (
        <p className="px-5 py-3 text-xs" style={{ color: "#f87171" }}>
          {err}
        </p>
      )}
    </div>
  );
}
