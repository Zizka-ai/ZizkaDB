"use client";

import { useState } from "react";
import Link from "next/link";
import { searchEvents } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { Search, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface Event {
  event_id: string;
  agent: string;
  timestamp: string;
  event: string;
  data: Record<string, unknown>;
  score?: number;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<"embeddings" | "network" | "other" | "">("");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setError("");
    try {
      const token = requireAuth();
      const res = await searchEvents(token, query);
      setResults(Array.isArray(res) ? res : (res?.results ?? []));
    } catch (err) {
      setResults([]);
      const msg = err instanceof Error ? err.message : "";
      const m = msg.toLowerCase();
      // The API returns a clear 400 when embeddings aren't configured — surface
      // it instead of silently showing "No results" (which looks broken).
      if (m.includes("embedding") || m.includes("configure")) {
        setError("embeddings");
      } else if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("load failed")) {
        setError("network");
      } else {
        setError("other");
        setErrorMsg(msg || "Something went wrong running the search.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-white font-semibold text-xl mb-1">
          Semantic Search
        </h1>
        <p className="text-sm" style={{ color: "#e5e5e5" }}>
          Search your agent history using natural language.
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="relative mb-6">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2"
          style={{ color: "#e5e5e5" }}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What did agents do about billing refunds?"
          autoFocus
          className="w-full rounded-xl pl-11 pr-4 py-3.5 text-sm text-white outline-none transition"
          style={{ background: "#111", border: "1px solid #1f1f1f" }}
          onFocus={(e) => (e.target.style.borderColor = "#22c55e")}
          onBlur={(e) => (e.target.style.borderColor = "#1f1f1f")}
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-4 py-1.5 text-xs font-medium text-black disabled:opacity-40 transition"
          style={{ background: "#22c55e" }}
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : "Search"}
        </button>
      </form>

      {/* Error / setup states */}
      {!loading && error === "embeddings" && (
        <div
          className="rounded-xl px-4 py-3.5 mb-6 text-sm"
          style={{ background: "#1f1a10", border: "1px solid #3a2f1a", color: "#fbbf24" }}
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium mb-1" style={{ color: "#fcd34d" }}>
                Semantic search needs embeddings
              </p>
              <p style={{ color: "#d4d4d4" }}>
                Add an OpenAI key in{" "}
                <Link
                  href="/dashboard/settings"
                  className="underline decoration-dotted underline-offset-2"
                  style={{ color: "#fcd34d" }}
                >
                  Settings → Embeddings
                </Link>{" "}
                to enable natural-language search. Logging and Causal Trace work without it.
              </p>
            </div>
          </div>
        </div>
      )}
      {!loading && error === "network" && (
        <div
          className="flex items-start gap-2.5 rounded-xl px-4 py-3 mb-6 text-sm"
          style={{ background: "#1f1414", border: "1px solid #3a1f1f", color: "#f87171" }}
        >
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>Couldn&apos;t reach the server. Check that the ZizkaDB API is running, then retry.</span>
        </div>
      )}
      {!loading && error === "other" && (
        <div
          className="flex items-start gap-2.5 rounded-xl px-4 py-3 mb-6 text-sm"
          style={{ background: "#1f1414", border: "1px solid #3a1f1f", color: "#f87171" }}
        >
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Results */}
      {searched && !loading && !error && results.length === 0 && (
        <div className="text-center py-12" style={{ color: "#e5e5e5" }}>
          No results for &quot;{query}&quot;
        </div>
      )}

      <div className="space-y-2">
        {results.map((event) => (
          <div
            key={event.event_id}
            className="rounded-xl p-4"
            style={{ background: "#111", border: "1px solid #1f1f1f" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-xs font-mono px-2 py-0.5 rounded"
                    style={{ background: "#1a1a1a", color: "#22c55e" }}
                  >
                    {event.event}
                  </span>
                  <span
                    className="text-xs font-mono"
                    style={{ color: "#e5e5e5" }}
                  >
                    {event.agent}
                  </span>
                </div>
                <div className="text-sm font-mono" style={{ color: "#e5e5e5" }}>
                  {JSON.stringify(event.data).slice(0, 120)}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-mono" style={{ color: "#e5e5e5" }}>
                  {format(new Date(event.timestamp), "MMM d, HH:mm")}
                </div>
                {event.score !== undefined && (
                  <div className="text-xs mt-0.5" style={{ color: "#e5e5e5" }}>
                    {(event.score * 100).toFixed(0)}% match
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Example queries */}
      {!searched && (
        <div className="mt-8">
          <p className="text-xs mb-3" style={{ color: "#e5e5e5" }}>
            Try searching for:
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              "tool call errors in the last session",
              "user asked about pricing",
              "agent made a handoff decision",
              "failed tool calls",
            ].map((q) => (
              <button
                key={q}
                onClick={() => setQuery(q)}
                className="text-xs px-3 py-1.5 rounded-lg transition"
                style={{
                  background: "#111",
                  border: "1px solid #1f1f1f",
                  color: "#e5e5e5",
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
