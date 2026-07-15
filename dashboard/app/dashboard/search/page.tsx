"use client";

import { useState } from "react";
import { searchEvents } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { Search, Loader2 } from "lucide-react";
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

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const token = requireAuth();
      const res = await searchEvents(token, query);
      setResults(Array.isArray(res) ? res : (res?.results ?? []));
    } catch {
      setResults([]);
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

      {/* Results */}
      {searched && !loading && results.length === 0 && (
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
