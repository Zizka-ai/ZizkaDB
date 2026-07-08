"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { AgentApiKeys } from "@/components/AgentApiKeys";
import {
  getEvents,
  getWhyChain,
  getAgentStats,
  getAgentSessions,
  getMemoryDiff,
  timeTravel,
  searchEvents,
  getAgentBaseline,
  deleteAgent,
} from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { POLL_INTERVAL_MS } from "@/lib/constants";
import {
  formatDistanceToNow,
  format,
  formatDuration,
  intervalToDuration,
} from "date-fns";
import {
  ChevronLeft,
  RefreshCw,
  Search,
  Clock,
  GitBranch,
  BarChart2,
  Layers,
  Rewind,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Zap,
  ArrowRight,
  Activity,
  TrendingUp,
  TrendingDown,
  Trash2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Event {
  event_id: string;
  agent: string;
  timestamp: string;
  event: string;
  data: Record<string, unknown>;
  parent_id: string | null;
  session_id: string | null;
  sequence_no: number;
}

interface Session {
  session_id: string;
  event_count: number;
  event_types: number;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  types: string[];
}

interface Stats {
  total_events: number;
  unique_event_types: number;
  sessions: number;
  first_event: string | null;
  last_event: string | null;
  top_events: { event: string; count: number }[];
}

interface WhyChain {
  event_id: string;
  chain_length: number;
  chain: Event[];
}

type Tab = "behavior" | "events" | "sessions" | "timetravel";
type PanelTab = "data" | "why";

// ── Baseline types ────────────────────────────────────────────────────────────

type DistMap = Record<string, number>;

interface BaselineWindow {
  sessions: number;
  events: number;
  event_distribution: DistMap;
  transitions: DistMap;
  avg_events_per_session: number;
  avg_session_seconds: number;
  error_rate_pct: number;
}

interface BaselineChange {
  metric: string;
  baseline: number;
  recent: number;
  delta_pp: number;
}

interface BaselineResponse {
  agent: string;
  status: "ok" | "warming_up" | "insufficient_data";
  message?: string;
  sessions: number;
  recent_window: number;
  baseline?: BaselineWindow;
  recent?: BaselineWindow;
  drift?: {
    score: number;
    behavior_change_pct: number;
    verdict:
      | "stable"
      | "minor_drift"
      | "noticeable_drift"
      | "significant_drift";
    biggest_changes: BaselineChange[];
    error_rate_change_pp: number;
    session_length_change_pct: number;
  };
}

const PAGE = 50;

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AgentPage() {
  const { id } = useParams<{ id: string }>();
  const agentId = decodeURIComponent(id);
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("events");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteAgent() {
    if (
      !window.confirm(
        `Delete agent "${agentId}", its API keys, and all events? This cannot be undone.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const token = requireAuth();
      await deleteAgent(token, agentId);
      router.push("/dashboard");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete agent");
      setDeleting(false);
    }
  }

  // ── events tab state ──────────────────────────────────────────────────────
  const [events, setEvents] = useState<Event[]>([]);
  const [evPage, setEvPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterSession, setFilterSession] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Event[] | null>(null);
  const [selected, setSelected] = useState<Event | null>(null);
  const [panelTab, setPanelTab] = useState<PanelTab>("data");
  const [whyChain, setWhyChain] = useState<WhyChain | null>(null);
  const [whyLoading, setWhyLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // ── sessions tab state ────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessLoading, setSessLoading] = useState(false);
  const [selSession, setSelSession] = useState<Session | null>(null);
  const [sessEvents, setSessEvents] = useState<Event[]>([]);
  const [sessDiff, setSessDiff] = useState<Record<string, unknown> | null>(
    null,
  );
  const [sessEvLoading, setSessEvLoading] = useState(false);

  // ── time travel state ─────────────────────────────────────────────────────
  const [ttTimestamp, setTtTimestamp] = useState("");
  const [ttLoading, setTtLoading] = useState(false);
  const [ttResult, setTtResult] = useState<Record<string, unknown> | null>(
    null,
  );
  const [ttError, setTtError] = useState("");

  // ── behavior tab state ────────────────────────────────────────────────────
  const [baseline, setBaseline] = useState<BaselineResponse | null>(null);
  const [baselineLoading, setBaselineLoading] = useState(false);
  const [baselineWindow, setBaselineWindow] = useState<
    "24h" | "7d" | "30d" | undefined
  >(undefined);

  // ── initial load ──────────────────────────────────────────────────────────
  const loadEvents = useCallback(
    async (
      pageNum = 1,
      append = false,
      session: string | null = null,
      type: string | null = null,
    ) => {
      let token: string;
      try {
        token = requireAuth();
      } catch {
        return;
      }
      const params: Record<string, string> = {
        limit: String(PAGE),
        offset: String((pageNum - 1) * PAGE),
      };
      if (session) params.session_id = session;
      if (type) params.event_type = type;
      try {
        const evs = await getEvents(token, agentId, params);
        setEvents((prev) => (append ? [...prev, ...evs] : evs));
        setHasMore(evs.length === PAGE);
      } catch {
        router.push("/login");
      }
    },
    [agentId, router],
  );

  const loadStats = useCallback(async () => {
    let token: string;
    try {
      token = requireAuth();
    } catch {
      return;
    }
    try {
      const st = await getAgentStats(token, agentId);
      setStats(st);
    } catch {}
  }, [agentId]);

  useEffect(() => {
    Promise.all([loadStats(), loadEvents(1), loadBaseline(true)])
      .then(() => setLastSync(new Date()))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadStats, loadEvents]);

  // ── live polling (30s) ──────────────────────────────────────────────────────
  useEffect(() => {
    if (loading) return;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      await loadStats();
      if (tab === "events" && !searchResults) {
        await loadEvents(1, false, filterSession, filterType);
      }
      if (tab === "behavior") {
        await loadBaseline(true);
      }
      if (tab === "sessions") {
        await loadSessions();
      }
      if (!cancelled) setLastSync(new Date());
    };

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, tab, filterSession, filterType, searchResults, agentId]);

  // ── refresh ───────────────────────────────────────────────────────────────
  const refresh = async () => {
    setRefreshing(true);
    setEvPage(1);
    setSelected(null);
    setWhyChain(null);
    setSearchResults(null);
    setSearchQ("");
    await Promise.all([
      loadStats(),
      loadEvents(1, false, filterSession, filterType),
    ]);
    setLastSync(new Date());
    setRefreshing(false);
  };

  // ── load more ─────────────────────────────────────────────────────────────
  const loadMore = async () => {
    const next = evPage + 1;
    setEvPage(next);
    await loadEvents(next, true, filterSession, filterType);
  };

  // ── filter by event type ──────────────────────────────────────────────────
  const applyFilter = async (type: string | null) => {
    setFilterType(type);
    setEvPage(1);
    setSelected(null);
    setSearchResults(null);
    await loadEvents(1, false, filterSession, type);
  };

  // ── semantic search ───────────────────────────────────────────────────────
  const doSearch = async () => {
    if (!searchQ.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    let token: string;
    try {
      token = requireAuth();
    } catch {
      return;
    }
    try {
      const res = await searchEvents(token, searchQ.trim(), agentId);
      setSearchResults(res.results ?? res);
    } finally {
      setSearching(false);
    }
  };

  // ── select event + causal chain ───────────────────────────────────────────
  const selectEvent = async (ev: Event) => {
    if (selected?.event_id === ev.event_id) {
      setSelected(null);
      setWhyChain(null);
      return;
    }
    setSelected(ev);
    setPanelTab("data");
    setWhyChain(null);
  };

  const loadWhy = async () => {
    if (!selected) return;
    if (whyChain?.event_id === selected.event_id) {
      setPanelTab("why");
      return;
    }
    setPanelTab("why");
    setWhyLoading(true);
    let token: string;
    try {
      token = requireAuth();
    } catch {
      return;
    }
    try {
      const chain = await getWhyChain(token, selected.event_id);
      setWhyChain(chain);
    } finally {
      setWhyLoading(false);
    }
  };

  // ── sessions tab ──────────────────────────────────────────────────────────
  const loadSessions = async () => {
    if (sessions.length > 0) return;
    setSessLoading(true);
    let token: string;
    try {
      token = requireAuth();
    } catch {
      return;
    }
    try {
      const s = await getAgentSessions(token, agentId);
      setSessions(s);
    } finally {
      setSessLoading(false);
    }
  };

  const openSession = async (sess: Session) => {
    setSelSession(sess);
    setSessEvLoading(true);
    setSessDiff(null);
    let token: string;
    try {
      token = requireAuth();
    } catch {
      return;
    }
    try {
      const [evs, diff] = await Promise.all([
        getEvents(token, agentId, {
          session_id: sess.session_id,
          limit: "200",
        }),
        getMemoryDiff(token, sess.session_id).catch(() => null),
      ]);
      setSessEvents(evs);
      setSessDiff(diff);
    } finally {
      setSessEvLoading(false);
    }
  };

  // ── behavior / baseline ───────────────────────────────────────────────────
  const loadBaseline = async (force = false, win?: "24h" | "7d" | "30d") => {
    if (!force && baseline) return;
    setBaselineLoading(true);
    let token: string;
    try {
      token = requireAuth();
    } catch {
      return;
    }
    try {
      const b = await getAgentBaseline(
        token,
        agentId,
        50,
        win ?? baselineWindow,
      );
      setBaseline(b);
    } finally {
      setBaselineLoading(false);
    }
  };

  // ── time travel ───────────────────────────────────────────────────────────
  const doTimeTravel = async () => {
    if (!ttTimestamp) {
      setTtError("Pick a date and time first.");
      return;
    }
    setTtError("");
    setTtLoading(true);
    setTtResult(null);
    let token: string;
    try {
      token = requireAuth();
    } catch {
      return;
    }
    try {
      const iso = new Date(ttTimestamp).toISOString();
      const result = await timeTravel(token, agentId, iso);
      setTtResult(result);
    } catch (e: unknown) {
      setTtError(
        e instanceof Error ? e.message : "Failed to reconstruct state.",
      );
    } finally {
      setTtLoading(false);
    }
  };

  if (loading)
    return (
      <Shell agentId={agentId} onDelete={handleDeleteAgent} deleting={deleting}>
        <Skeleton />
      </Shell>
    );

  const displayEvents = searchResults ?? events;

  return (
    <Shell
      agentId={agentId}
      lastSync={lastSync}
      onDelete={handleDeleteAgent}
      deleting={deleting}
    >
      <AgentApiKeys agentId={agentId} onTestSuccess={refresh} />
      {/* ── Stats ── */}
      {stats && <StatsRow stats={stats} baseline={baseline} />}

      {/* ── Tab bar ── */}
      <div
        className="flex gap-1 mb-6 p-1 rounded-xl"
        style={{ background: "#0d0d0d", border: "1px solid #1f1f1f" }}
      >
        {(
          [
            {
              key: "behavior",
              label: "Behavior",
              icon: Activity,
              badge: "NEW" as const,
            },
            { key: "events", label: "Events", icon: BarChart2 },
            { key: "sessions", label: "Sessions", icon: Layers },
            { key: "timetravel", label: "Time Travel", icon: Rewind },
          ] as {
            key: Tab;
            label: string;
            icon: React.ElementType;
            badge?: "NEW";
          }[]
        ).map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            onClick={() => {
              setTab(key);
              if (key === "sessions") loadSessions();
              if (key === "behavior") loadBaseline();
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition"
            style={{
              background: tab === key ? "#1a1a1a" : "transparent",
              color: tab === key ? "#e5e5e5" : "#e5e5e5",
              border:
                tab === key ? "1px solid #2a2a2a" : "1px solid transparent",
            }}
          >
            <Icon size={14} />
            {label}
            {badge && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{
                  background: "#f97316",
                  color: "#fff",
                  letterSpacing: 0.5,
                }}
              >
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════ BEHAVIOR TAB ══════════════════ */}
      {tab === "behavior" && (
        <BehaviorTab
          baseline={baseline}
          loading={baselineLoading}
          agentId={agentId}
          window={baselineWindow}
          onWindowChange={(win) => {
            setBaselineWindow(win);
            setBaseline(null);
            loadBaseline(true, win);
          }}
          onRetry={() => {
            setBaseline(null);
            loadBaseline(true, baselineWindow);
          }}
        />
      )}

      {/* ══════════════════ EVENTS TAB ══════════════════ */}
      {tab === "events" && (
        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            {/* Search + refresh */}
            <div className="flex gap-2 mb-4">
              <div
                className="flex-1 flex items-center gap-2 rounded-lg px-3"
                style={{ background: "#111", border: "1px solid #1f1f1f" }}
              >
                <Search size={13} style={{ color: "#e5e5e5" }} />
                <input
                  className="flex-1 bg-transparent py-2.5 text-sm outline-none"
                  style={{ color: "#e5e5e5" }}
                  placeholder="Semantic search across events…"
                  value={searchQ}
                  onChange={(e) => {
                    setSearchQ(e.target.value);
                    if (!e.target.value) setSearchResults(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && doSearch()}
                />
                {searchQ && (
                  <button
                    onClick={doSearch}
                    className="text-xs px-2 py-1 rounded"
                    style={{ background: "#22c55e20", color: "#22c55e" }}
                  >
                    {searching ? "…" : "Search"}
                  </button>
                )}
              </div>
              <button
                onClick={refresh}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition"
                style={{
                  background: "#111",
                  color: "#e5e5e5",
                  border: "1px solid #1f1f1f",
                }}
              >
                <RefreshCw
                  size={12}
                  className={refreshing ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>

            {/* Event type filter pills */}
            {stats && stats.top_events.length > 0 && !searchResults && (
              <div className="flex gap-1.5 flex-wrap mb-4">
                <FilterPill
                  label="All"
                  active={!filterType}
                  onClick={() => applyFilter(null)}
                />
                {stats.top_events.map((e) => (
                  <FilterPill
                    key={e.event}
                    label={`${e.event} (${e.count})`}
                    active={filterType === e.event}
                    onClick={() =>
                      applyFilter(filterType === e.event ? null : e.event)
                    }
                    color={eventColor(e.event)}
                  />
                ))}
              </div>
            )}

            {searchResults && (
              <div
                className="flex items-center justify-between mb-3 text-xs"
                style={{ color: "#e5e5e5" }}
              >
                <span>
                  {searchResults.length} semantic results for &quot;{searchQ}
                  &quot;
                </span>
              </div>
            )}

            {/* Event list */}
            <EventList
              events={displayEvents}
              selected={selected}
              expanded={expanded}
              onSelect={selectEvent}
              onToggleExpand={(id) => setExpanded(expanded === id ? null : id)}
            />

            {!searchResults && hasMore && (
              <button
                onClick={loadMore}
                className="w-full mt-4 py-2.5 rounded-lg text-sm transition"
                style={{
                  background: "#111",
                  color: "#e5e5e5",
                  border: "1px solid #1f1f1f",
                }}
              >
                Load more
              </button>
            )}

            {displayEvents.length === 0 && (
              <div
                className="text-center py-12 text-sm"
                style={{ color: "#e5e5e5" }}
              >
                No events found.
              </div>
            )}
          </div>

          {/* Side panel */}
          {selected && (
            <div className="w-80 shrink-0">
              <div
                className="flex mb-2 rounded-xl overflow-hidden"
                style={{ background: "#111", border: "1px solid #1f1f1f" }}
              >
                <PanelTabBtn
                  label="Data"
                  active={panelTab === "data"}
                  onClick={() => setPanelTab("data")}
                />
                <PanelTabBtn
                  label="Why? (causal)"
                  active={panelTab === "why"}
                  onClick={loadWhy}
                />
              </div>

              <div
                className="rounded-xl p-4 sticky top-4 overflow-auto max-h-[80vh]"
                style={{ background: "#111", border: "1px solid #1f1f1f" }}
              >
                {panelTab === "data" && <DataPanel event={selected} />}

                {panelTab === "why" &&
                  (whyLoading ? (
                    <div
                      className="text-sm animate-pulse py-4 text-center"
                      style={{ color: "#e5e5e5" }}
                    >
                      Tracing causal chain…
                    </div>
                  ) : whyChain ? (
                    <WhyPanel chain={whyChain} />
                  ) : null)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ SESSIONS TAB ══════════════════ */}
      {tab === "sessions" && (
        <div className="flex gap-4">
          {/* Session list */}
          <div className="w-72 shrink-0">
            <h2
              className="text-xs font-medium mb-3"
              style={{ color: "#e5e5e5" }}
            >
              {sessions.length} session{sessions.length !== 1 ? "s" : ""}
            </h2>
            {sessLoading ? (
              <Skeleton rows={5} />
            ) : sessions.length === 0 ? (
              <div
                className="text-sm py-8 text-center"
                style={{ color: "#e5e5e5" }}
              >
                No sessions recorded yet.
                <br />
                <span className="text-xs">
                  Pass a <code className="text-green-400">session_id</code> when
                  logging events.
                </span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {sessions.map((s) => (
                  <button
                    key={s.session_id}
                    onClick={() => openSession(s)}
                    className="w-full text-left rounded-xl p-3.5 transition"
                    style={{
                      background:
                        selSession?.session_id === s.session_id
                          ? "#0f1f0f"
                          : "#111",
                      border: `1px solid ${selSession?.session_id === s.session_id ? "#22c55e40" : "#1f1f1f"}`,
                    }}
                  >
                    <div
                      className="text-xs font-mono mb-1 truncate"
                      style={{ color: "#e5e5e5" }}
                    >
                      {s.session_id.slice(0, 20)}…
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: "#e5e5e5" }}>
                        {s.event_count} events · {s.event_types} types
                      </span>
                      <span className="text-xs" style={{ color: "#e5e5e5" }}>
                        {s.duration_seconds > 0
                          ? formatDuration(
                              intervalToDuration({
                                start: 0,
                                end: s.duration_seconds * 1000,
                              }),
                              { format: ["hours", "minutes", "seconds"] },
                            )
                              .replace(" seconds", "s")
                              .replace(" minutes", "m")
                              .replace(" hours", "h") || "<1s"
                          : "<1s"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {s.types.slice(0, 4).map((t) => (
                        <span
                          key={t}
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            background: `${eventColor(t)}20`,
                            color: eventColor(t),
                          }}
                        >
                          {t}
                        </span>
                      ))}
                      {s.types.length > 4 && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{ background: "#1a1a1a", color: "#e5e5e5" }}
                        >
                          +{s.types.length - 4}
                        </span>
                      )}
                    </div>
                    <div
                      className="text-xs mt-1.5"
                      style={{ color: "#e5e5e5" }}
                    >
                      {format(new Date(s.started_at), "MMM d, HH:mm:ss")}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Session detail */}
          <div className="flex-1 min-w-0">
            {!selSession ? (
              <div
                className="flex flex-col items-center justify-center h-64"
                style={{ color: "#e5e5e5" }}
              >
                <Layers size={32} className="mb-3 opacity-30" />
                <p className="text-sm">
                  Select a session to inspect its events
                </p>
              </div>
            ) : sessEvLoading ? (
              <Skeleton rows={6} />
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-medium text-white font-mono">
                      {selSession.session_id}
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: "#e5e5e5" }}>
                      {format(
                        new Date(selSession.started_at),
                        "MMM d yyyy, HH:mm:ss",
                      )}
                      {" → "}
                      {format(new Date(selSession.ended_at), "HH:mm:ss")}
                    </p>
                  </div>
                  {sessDiff && (
                    <div
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{
                        background: "#1a1a1a",
                        border: "1px solid #2a2a2a",
                      }}
                    >
                      {(sessDiff as { new_event_types?: string[] })
                        .new_event_types?.length ? (
                        <span style={{ color: "#22c55e" }}>
                          {
                            (sessDiff as { new_event_types: string[] })
                              .new_event_types.length
                          }{" "}
                          new event type
                          {(sessDiff as { new_event_types: string[] })
                            .new_event_types.length !== 1
                            ? "s"
                            : ""}
                        </span>
                      ) : (
                        <span style={{ color: "#e5e5e5" }}>
                          No new event types
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {sessDiff && (sessDiff as { summary?: string }).summary && (
                  <div
                    className="mb-4 p-3 rounded-lg text-sm"
                    style={{
                      background: "#0f1a0f",
                      border: "1px solid #22c55e20",
                      color: "#86efac",
                    }}
                  >
                    {(sessDiff as { summary: string }).summary}
                  </div>
                )}

                <EventList
                  events={sessEvents}
                  selected={null}
                  expanded={expanded}
                  onSelect={() => {}}
                  onToggleExpand={(id) =>
                    setExpanded(expanded === id ? null : id)
                  }
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════ TIME TRAVEL TAB ══════════════════ */}
      {tab === "timetravel" && (
        <div className="max-w-2xl">
          <div
            className="mb-6 p-4 rounded-xl text-sm"
            style={{
              background: "#0d0d0d",
              border: "1px solid #1f1f1f",
              color: "#e5e5e5",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Rewind size={14} style={{ color: "#22c55e" }} />
              <span className="text-white font-medium">Time Travel</span>
            </div>
            Reconstruct logged state for{" "}
            <span className="font-mono text-white">{agentId}</span> at any point
            in time. See every event that had happened up to that moment.
          </div>

          <div className="flex gap-3 mb-6">
            <input
              type="datetime-local"
              value={ttTimestamp}
              onChange={(e) => setTtTimestamp(e.target.value)}
              className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none"
              style={{
                background: "#111",
                border: "1px solid #2a2a2a",
                color: "#e5e5e5",
                colorScheme: "dark",
              }}
            />
            <button
              onClick={doTimeTravel}
              disabled={ttLoading || !ttTimestamp}
              className="px-5 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg,#166534,#15803d)",
                color: "#dcfce7",
              }}
            >
              {ttLoading ? "Reconstructing…" : "Reconstruct state"}
            </button>
          </div>

          {ttError && (
            <div
              className="flex items-center gap-2 p-3 rounded-lg mb-4 text-sm"
              style={{
                background: "#1a0000",
                border: "1px solid #ef444440",
                color: "#f87171",
              }}
            >
              <AlertCircle size={14} />
              {ttError}
            </div>
          )}

          {ttResult && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="rounded-xl p-4"
                  style={{ background: "#111", border: "1px solid #1f1f1f" }}
                >
                  <div className="text-xs mb-1" style={{ color: "#e5e5e5" }}>
                    Events at this time
                  </div>
                  <div className="text-2xl font-bold font-mono text-white">
                    {(ttResult as { event_count: number }).event_count}
                  </div>
                </div>
                <div
                  className="rounded-xl p-4"
                  style={{ background: "#111", border: "1px solid #1f1f1f" }}
                >
                  <div className="text-xs mb-1" style={{ color: "#e5e5e5" }}>
                    Reconstructed at
                  </div>
                  <div className="text-sm font-mono text-white">
                    {format(new Date(ttTimestamp), "MMM d yyyy, HH:mm:ss")}
                  </div>
                </div>
              </div>

              {/* State */}
              <div
                className="rounded-xl"
                style={{ background: "#111", border: "1px solid #1f1f1f" }}
              >
                <div
                  className="px-4 py-3 border-b flex items-center gap-2"
                  style={{ borderColor: "#1f1f1f" }}
                >
                  <Zap size={13} style={{ color: "#22c55e" }} />
                  <span className="text-sm font-medium text-white">
                    Reconstructed state
                  </span>
                  <span
                    className="text-xs ml-auto"
                    style={{ color: "#e5e5e5" }}
                  >
                    Based on all STATE_SET events up to this point
                  </span>
                </div>
                <pre
                  className="p-4 text-xs overflow-x-auto"
                  style={{ color: "#86efac", maxHeight: 300 }}
                >
                  {JSON.stringify(
                    (ttResult as { state: unknown }).state,
                    null,
                    2,
                  )}
                </pre>
              </div>
            </div>
          )}

          {/* Quick picks */}
          {stats?.last_event && !ttResult && (
            <div>
              <div className="text-xs mb-2" style={{ color: "#e5e5e5" }}>
                Quick picks
              </div>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: "1 hour ago", ms: 60 * 60 * 1000 },
                  { label: "6 hours ago", ms: 6 * 60 * 60 * 1000 },
                  { label: "1 day ago", ms: 24 * 60 * 60 * 1000 },
                  { label: "1 week ago", ms: 7 * 24 * 60 * 60 * 1000 },
                ].map(({ label, ms }) => {
                  const dt = new Date(Date.now() - ms);
                  const val = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}T${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
                  return (
                    <button
                      key={label}
                      onClick={() => setTtTimestamp(val)}
                      className="text-xs px-3 py-1.5 rounded-lg transition"
                      style={{
                        background: "#111",
                        color: "#e5e5e5",
                        border: "1px solid #1f1f1f",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatsRow({
  stats,
  baseline,
}: {
  stats: Stats;
  baseline: BaselineResponse | null;
}) {
  const bcPct =
    baseline?.status === "ok"
      ? (baseline.drift?.behavior_change_pct ?? null)
      : null;
  const bcValue = bcPct !== null ? `${bcPct.toFixed(1)}%` : "—";
  const bcColor =
    bcPct === null
      ? "#e5e5e5"
      : bcPct < 5
        ? "#22c55e"
        : bcPct < 15
          ? "#eab308"
          : bcPct < 30
            ? "#f97316"
            : "#ef4444";

  return (
    <div className="grid grid-cols-5 gap-3 mb-6">
      {[
        {
          label: "Total events",
          value: stats.total_events.toLocaleString(),
          icon: BarChart2,
          color: "#e5e5e5",
        },
        {
          label: "Event types",
          value: stats.unique_event_types,
          icon: GitBranch,
          color: "#e5e5e5",
        },
        {
          label: "Sessions",
          value: stats.sessions,
          icon: Layers,
          color: "#e5e5e5",
        },
        {
          label: "Last event",
          value: stats.last_event
            ? formatDistanceToNow(new Date(stats.last_event), {
                addSuffix: true,
              })
            : "—",
          icon: Clock,
          color: "#e5e5e5",
        },
        {
          label: "Behavior Change",
          value: bcValue,
          icon: Activity,
          color: bcColor,
        },
      ].map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          className="rounded-xl p-4"
          style={{ background: "#111", border: "1px solid #1f1f1f" }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Icon size={12} style={{ color: "#e5e5e5" }} />
            <span className="text-xs" style={{ color: "#e5e5e5" }}>
              {label}
            </span>
          </div>
          <div className="font-semibold font-mono text-lg" style={{ color }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}

function EventList({
  events,
  selected,
  expanded,
  onSelect,
  onToggleExpand,
}: {
  events: Event[];
  selected: Event | null;
  expanded: string | null;
  onSelect: (e: Event) => void;
  onToggleExpand: (id: string) => void;
}) {
  const grouped = useMemo(() => groupBySession(events), [events]);
  return (
    <div className="space-y-4">
      {grouped.map(({ sessionId, events: evs }) => (
        <div key={sessionId ?? "__none__"}>
          {sessionId && (
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-xs font-mono px-2 py-0.5 rounded shrink-0"
                style={{
                  background: "#1a1a1a",
                  color: "#e5e5e5",
                  border: "1px solid #2a2a2a",
                }}
              >
                session {sessionId.slice(0, 14)}…
              </span>
              <div className="flex-1 h-px" style={{ background: "#1a1a1a" }} />
              <span className="text-xs shrink-0" style={{ color: "#e5e5e5" }}>
                {evs.length} events
              </span>
            </div>
          )}
          <div className="space-y-1">
            {evs.map((ev) => {
              const isSelected = selected?.event_id === ev.event_id;
              const isExpanded = expanded === ev.event_id;
              return (
                <div key={ev.event_id}>
                  <button
                    onClick={() => onSelect(ev)}
                    className="w-full text-left rounded-lg px-4 py-3 transition group"
                    style={{
                      background: isSelected ? "#0f1f0f" : "#111",
                      border: `1px solid ${isSelected ? "#22c55e40" : "#1f1f1f"}`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <EventDot type={ev.event} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-sm font-mono"
                              style={{ color: "#e5e5e5" }}
                            >
                              {ev.event}
                            </span>
                            {ev.parent_id && (
                              <span
                                className="text-xs px-1.5 py-0.5 rounded"
                                style={{
                                  background: "#1a2a1a",
                                  color: "#22c55e",
                                }}
                              >
                                causal
                              </span>
                            )}
                            {ev.event === "error" && (
                              <AlertCircle
                                size={12}
                                style={{ color: "#ef4444" }}
                              />
                            )}
                          </div>
                          <div
                            className="text-xs font-mono mt-0.5 truncate"
                            style={{ color: "#e5e5e5" }}
                          >
                            {JSON.stringify(ev.data).slice(0, 90)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <span
                          className="text-xs font-mono"
                          style={{ color: "#e5e5e5" }}
                        >
                          #{ev.sequence_no}
                        </span>
                        <span
                          className="text-xs font-mono"
                          style={{ color: "#e5e5e5" }}
                        >
                          {format(new Date(ev.timestamp), "HH:mm:ss")}
                        </span>
                      </div>
                    </div>
                  </button>

                  {isSelected && (
                    <div
                      className="mx-0.5 rounded-b-lg"
                      style={{
                        background: "#0a0a0a",
                        border: "1px solid #1a1a1a",
                        borderTop: "none",
                      }}
                    >
                      <button
                        onClick={() => onToggleExpand(ev.event_id)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs"
                        style={{ color: "#e5e5e5" }}
                      >
                        {isExpanded ? (
                          <ChevronDown size={11} />
                        ) : (
                          <ChevronRight size={11} />
                        )}
                        Full payload
                      </button>
                      {isExpanded && (
                        <pre
                          className="px-4 pb-3 text-xs overflow-x-auto"
                          style={{ color: "#86efac", maxHeight: 240 }}
                        >
                          {JSON.stringify(ev.data, null, 2)}
                        </pre>
                      )}
                      <div
                        className="px-4 pb-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs"
                        style={{ color: "#e5e5e5" }}
                      >
                        <span>
                          id:{" "}
                          <span className="font-mono">
                            {ev.event_id.slice(0, 18)}…
                          </span>
                        </span>
                        {ev.session_id && (
                          <span>
                            session:{" "}
                            <span className="font-mono">
                              {ev.session_id.slice(0, 12)}…
                            </span>
                          </span>
                        )}
                        <span>
                          {format(
                            new Date(ev.timestamp),
                            "yyyy-MM-dd HH:mm:ss.SSS",
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function DataPanel({ event }: { event: Event }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <EventDot type={event.event} />
        <span
          className="font-mono font-semibold text-sm"
          style={{ color: "#e5e5e5" }}
        >
          {event.event}
        </span>
      </div>
      <pre
        className="text-xs overflow-x-auto rounded-lg p-3 mb-3"
        style={{ background: "#0a0a0a", color: "#86efac", maxHeight: 280 }}
      >
        {JSON.stringify(event.data, null, 2)}
      </pre>
      <div className="space-y-2">
        <MetaRow label="event_id" value={event.event_id} />
        <MetaRow label="sequence" value={`#${event.sequence_no}`} />
        <MetaRow
          label="timestamp"
          value={format(new Date(event.timestamp), "yyyy-MM-dd HH:mm:ss.SSS")}
        />
        {event.session_id && (
          <MetaRow label="session_id" value={event.session_id} />
        )}
        {event.parent_id && (
          <MetaRow label="parent_id" value={event.parent_id} />
        )}
      </div>
    </div>
  );
}

function WhyPanel({ chain }: { chain: WhyChain }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <GitBranch size={13} style={{ color: "#22c55e" }} />
        <span className="text-xs font-medium" style={{ color: "#e5e5e5" }}>
          {chain.chain_length} event{chain.chain_length !== 1 ? "s" : ""} in
          causal chain
        </span>
      </div>
      <div className="space-y-0">
        {chain.chain.map((e, i) => (
          <div key={e.event_id} className="flex gap-3">
            {/* Connector */}
            <div className="flex flex-col items-center">
              <EventDot type={e.event} />
              {i < chain.chain.length - 1 && (
                <div
                  className="w-px flex-1 my-1"
                  style={{ background: "#2a2a2a", minHeight: 16 }}
                />
              )}
            </div>
            <div className="pb-3 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-mono font-medium"
                  style={{ color: "#e5e5e5" }}
                >
                  {e.event}
                </span>
                {i === 0 && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: "#1a2a1a", color: "#22c55e" }}
                  >
                    root
                  </span>
                )}
                {i === chain.chain.length - 1 && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: "#2a1a1a", color: "#f87171" }}
                  >
                    selected
                  </span>
                )}
              </div>
              <div
                className="text-xs font-mono truncate mt-0.5"
                style={{ color: "#e5e5e5" }}
              >
                {JSON.stringify(e.data).slice(0, 55)}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs" style={{ color: "#e5e5e5" }}>
                  {format(new Date(e.timestamp), "HH:mm:ss.SSS")}
                </span>
                {i < chain.chain.length - 1 && (
                  <ArrowRight size={10} style={{ color: "#2a2a2a" }} />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Behavior tab ──────────────────────────────────────────────────────────────

function BehaviorTab({
  baseline,
  loading,
  agentId,
  window: win,
  onWindowChange,
  onRetry,
}: {
  baseline: BaselineResponse | null;
  loading: boolean;
  agentId: string;
  window: "24h" | "7d" | "30d" | undefined;
  onWindowChange: (win: "24h" | "7d" | "30d" | undefined) => void;
  onRetry: () => void;
}) {
  const WINDOWS = [
    { key: undefined, label: "Sessions" },
    { key: "24h" as const, label: "24h" },
    { key: "7d" as const, label: "7d" },
    { key: "30d" as const, label: "30d" },
  ];

  return (
    <div className="space-y-5">
      {/* Window selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: "#666" }}>
          Window:
        </span>
        <div className="flex gap-1">
          {WINDOWS.map((w) => (
            <button
              key={String(w.key)}
              onClick={() => onWindowChange(w.key)}
              className="px-3 py-1 rounded-lg text-xs transition"
              style={{
                background: win === w.key ? "#f9731620" : "transparent",
                color: win === w.key ? "#f97316" : "#888",
                border: `1px solid ${win === w.key ? "#f9731640" : "#2a2a2a"}`,
              }}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>
      {loading || !baseline ? (
        <Skeleton rows={6} />
      ) : (
        <BehaviorTabContent
          baseline={baseline}
          agentId={agentId}
          win={win}
          onRetry={onRetry}
        />
      )}
    </div>
  );
}

function BehaviorTabContent({
  baseline,
  agentId,
  win,
  onRetry,
}: {
  baseline: BaselineResponse;
  agentId: string;
  win: "24h" | "7d" | "30d" | undefined;
  onRetry: () => void;
}) {
  if (baseline.status === "insufficient_data") {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ background: "#0d0d0d", border: "1px solid #1f1f1f" }}
      >
        <Activity
          size={32}
          style={{ color: "#e5e5e5", margin: "0 auto 12px" }}
        />
        <h3 className="text-base font-medium mb-2" style={{ color: "#e5e5e5" }}>
          No baseline yet
        </h3>
        <p className="text-sm" style={{ color: "#e5e5e5" }}>
          {baseline.message}
        </p>
      </div>
    );
  }

  const recent_window = baseline.recent_window;
  const sessions = baseline.sessions;

  if (baseline.status === "warming_up") {
    const recent = baseline.recent;
    return (
      <div className="space-y-4">
        <div
          className="rounded-xl p-5"
          style={{ background: "#1a0f00", border: "1px solid #f9731640" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Activity size={14} style={{ color: "#f97316" }} />
            <h3 className="text-sm font-semibold" style={{ color: "#fed7aa" }}>
              Warming up
            </h3>
          </div>
          <p className="text-sm" style={{ color: "#fdba74" }}>
            {baseline.message} Drift detection kicks in once{" "}
            <span className="font-mono">{agentId}</span> has more than{" "}
            {recent_window} sessions.
          </p>
        </div>
        {recent && (
          <WindowCard
            title="Current behavior"
            subtitle={`${recent.sessions} sessions, ${recent.events} events`}
            window={recent}
            highlight
          />
        )}
      </div>
    );
  }

  const drift = baseline.drift!;
  const baseW = baseline.baseline!;
  const recentW = baseline.recent!;

  return (
    <div className="space-y-5">
      {/* Drift headline */}
      <DriftHeadline
        drift={drift}
        agentId={agentId}
        sessions={sessions}
        recentWindow={recent_window}
        onRetry={onRetry}
      />

      {/* Biggest changes */}
      {drift.biggest_changes.length > 0 && (
        <div
          className="rounded-xl"
          style={{ background: "#0d0d0d", border: "1px solid #1f1f1f" }}
        >
          <div
            className="px-4 py-3 border-b flex items-center gap-2"
            style={{ borderColor: "#1f1f1f" }}
          >
            <TrendingUp size={13} style={{ color: "#22c55e" }} />
            <span className="text-sm font-medium text-white">
              Biggest behavioral changes
            </span>
            <span className="text-xs ml-auto" style={{ color: "#e5e5e5" }}>
              {win
                ? `last ${win} vs prior sessions`
                : `recent ${recent_window} vs prior ${sessions - recent_window} sessions`}
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: "#1f1f1f" }}>
            {drift.biggest_changes.map((c) => (
              <ChangeRow key={c.metric} change={c} />
            ))}
          </div>
        </div>
      )}

      {/* Side by side windows */}
      <div className="grid grid-cols-2 gap-4">
        <WindowCard
          title="Baseline"
          subtitle={`${baseW.sessions} sessions, ${baseW.events} events (older)`}
          window={baseW}
        />
        <WindowCard
          title="Recent"
          subtitle={`${recentW.sessions} sessions, ${recentW.events} events (newest ${recent_window})`}
          window={recentW}
          highlight
        />
      </div>
    </div>
  );
}

function DriftHeadline({
  drift,
  agentId,
  sessions,
  recentWindow,
  onRetry,
}: {
  drift: NonNullable<BaselineResponse["drift"]>;
  agentId: string;
  sessions: number;
  recentWindow: number;
  onRetry: () => void;
}) {
  const verdictMeta = {
    stable: {
      color: "#22c55e",
      bg: "#0f1f0f",
      border: "#22c55e40",
      label: "Stable",
      desc: `${agentId} is behaving consistently with its baseline.`,
    },
    minor_drift: {
      color: "#eab308",
      bg: "#1a1500",
      border: "#eab30840",
      label: "Minor drift",
      desc: `Small shifts in event distribution. Worth a quick look.`,
    },
    noticeable_drift: {
      color: "#f97316",
      bg: "#1a0f00",
      border: "#f9731640",
      label: "Noticeable drift",
      desc: `Recent sessions are diverging from baseline. Investigate before users notice.`,
    },
    significant_drift: {
      color: "#ef4444",
      bg: "#1a0000",
      border: "#ef444440",
      label: "Significant drift",
      desc: `Recent sessions look meaningfully different. Likely a regression.`,
    },
  };
  const m = verdictMeta[drift.verdict];
  const scorePct = Math.round(drift.score * 100);

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: m.bg, border: `1px solid ${m.border}` }}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity size={14} style={{ color: m.color }} />
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: m.color }}
            >
              {m.label}
            </span>
          </div>
          <h2 className="text-lg font-semibold" style={{ color: "#fff" }}>
            Behavior change: <span className="font-mono">{scorePct}%</span>
            <span
              className="text-sm font-normal ml-2"
              style={{ color: "#e5e5e5" }}
            >
              (score {drift.score.toFixed(3)})
            </span>
          </h2>
          <p className="text-sm mt-1" style={{ color: "#d4d4d4" }}>
            {m.desc}
          </p>
        </div>
        <button
          onClick={onRetry}
          className="text-xs px-3 py-1.5 rounded-lg transition shrink-0"
          style={{
            background: "#0a0a0a",
            color: "#e5e5e5",
            border: "1px solid #2a2a2a",
          }}
        >
          <RefreshCw size={11} className="inline mr-1" />
          Recompute
        </button>
      </div>

      {/* Progress bar */}
      <div
        className="h-2 rounded-full overflow-hidden mb-3"
        style={{ background: "#0a0a0a" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(scorePct, 100)}%`, background: m.color }}
        />
      </div>

      {/* Sub-stats */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <SubStat
          label="Sessions analyzed"
          value={String(sessions)}
          sub={`${recentWindow} recent vs ${sessions - recentWindow} prior`}
        />
        <SubStat
          label="Error rate delta"
          value={`${drift.error_rate_change_pp >= 0 ? "+" : ""}${drift.error_rate_change_pp.toFixed(2)}pp`}
          sub={
            drift.error_rate_change_pp > 0.5
              ? "Errors up"
              : drift.error_rate_change_pp < -0.5
                ? "Errors down"
                : "Unchanged"
          }
          tone={
            drift.error_rate_change_pp > 0.5
              ? "bad"
              : drift.error_rate_change_pp < -0.5
                ? "good"
                : "neutral"
          }
        />
        <SubStat
          label="Avg session length"
          value={`${drift.session_length_change_pct >= 0 ? "+" : ""}${drift.session_length_change_pct.toFixed(1)}%`}
          sub={
            Math.abs(drift.session_length_change_pct) > 15
              ? "Significant shift"
              : "Within normal range"
          }
          tone={
            Math.abs(drift.session_length_change_pct) > 15 ? "bad" : "neutral"
          }
        />
      </div>
    </div>
  );
}

function SubStat({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "good" | "bad" | "neutral";
}) {
  const c =
    tone === "good" ? "#22c55e" : tone === "bad" ? "#ef4444" : "#e5e5e5";
  return (
    <div
      className="rounded-lg p-3"
      style={{ background: "#0a0a0a", border: "1px solid #1f1f1f" }}
    >
      <div className="text-xs mb-1" style={{ color: "#e5e5e5" }}>
        {label}
      </div>
      <div className="text-base font-semibold font-mono" style={{ color: c }}>
        {value}
      </div>
      <div className="text-xs mt-0.5" style={{ color: "#e5e5e5" }}>
        {sub}
      </div>
    </div>
  );
}

function ChangeRow({ change }: { change: BaselineChange }) {
  const isUp = change.delta_pp > 0;
  const Icon = isUp ? TrendingUp : TrendingDown;
  const color = Math.abs(change.delta_pp) > 10 ? "#f97316" : "#e5e5e5";

  const [scope, ...rest] = change.metric.split(".");
  const detail = rest.join(".");
  const scopeLabel =
    scope === "event_distribution"
      ? "event"
      : scope === "transitions"
        ? "transition"
        : scope;

  return (
    <div className="px-4 py-2.5 flex items-center gap-3">
      <Icon size={13} style={{ color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span
            className="text-xs uppercase tracking-wider"
            style={{ color: "#e5e5e5" }}
          >
            {scopeLabel}
          </span>
          <span
            className="text-sm font-mono truncate"
            style={{ color: "#e5e5e5" }}
          >
            {detail}
          </span>
        </div>
        <div className="text-xs font-mono mt-0.5" style={{ color: "#e5e5e5" }}>
          {change.baseline.toFixed(2)}% → {change.recent.toFixed(2)}%
        </div>
      </div>
      <div
        className="text-sm font-semibold font-mono shrink-0"
        style={{ color }}
      >
        {isUp ? "+" : ""}
        {change.delta_pp.toFixed(2)}pp
      </div>
    </div>
  );
}

function WindowCard({
  title,
  subtitle,
  window: w,
  highlight = false,
}: {
  title: string;
  subtitle: string;
  window: BaselineWindow;
  highlight?: boolean;
}) {
  const topEvents = useMemo(() => topN(w.event_distribution, 6), [w]);
  const topTransitions = useMemo(() => topN(w.transitions, 5), [w]);

  return (
    <div
      className="rounded-xl"
      style={{
        background: highlight ? "#0f1f0f" : "#0d0d0d",
        border: `1px solid ${highlight ? "#22c55e30" : "#1f1f1f"}`,
      }}
    >
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: highlight ? "#22c55e20" : "#1f1f1f" }}
      >
        <div className="text-sm font-semibold" style={{ color: "#fff" }}>
          {title}
        </div>
        <div className="text-xs mt-0.5" style={{ color: "#e5e5e5" }}>
          {subtitle}
        </div>
      </div>
      <div className="p-4 space-y-4">
        {/* Quick numbers */}
        <div className="grid grid-cols-3 gap-2">
          <Mini
            label="Events / session"
            value={w.avg_events_per_session.toFixed(1)}
          />
          <Mini
            label="Avg duration"
            value={
              w.avg_session_seconds < 60
                ? `${w.avg_session_seconds.toFixed(0)}s`
                : `${(w.avg_session_seconds / 60).toFixed(1)}m`
            }
          />
          <Mini
            label="Error rate"
            value={`${w.error_rate_pct.toFixed(1)}%`}
            tone={w.error_rate_pct > 5 ? "bad" : "neutral"}
          />
        </div>

        {/* Event distribution */}
        <div>
          <div
            className="text-xs font-medium mb-2"
            style={{ color: "#e5e5e5" }}
          >
            Event distribution
          </div>
          {topEvents.length === 0 ? (
            <div className="text-xs" style={{ color: "#e5e5e5" }}>
              No events
            </div>
          ) : (
            <div className="space-y-1.5">
              {topEvents.map(([type, pct]) => (
                <DistRow
                  key={type}
                  label={type}
                  pct={pct}
                  color={eventColor(type)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Top transitions */}
        {topTransitions.length > 0 && (
          <div>
            <div
              className="text-xs font-medium mb-2"
              style={{ color: "#e5e5e5" }}
            >
              Common decision sequences (parent → child)
            </div>
            <div className="space-y-1.5">
              {topTransitions.map(([key, pct]) => (
                <DistRow key={key} label={key} pct={pct} color="#3b82f6" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DistRow({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span
          className="text-xs font-mono truncate pr-2"
          style={{ color: "#d4d4d4" }}
        >
          {label}
        </span>
        <span
          className="text-xs font-mono shrink-0"
          style={{ color: "#e5e5e5" }}
        >
          {pct.toFixed(1)}%
        </span>
      </div>
      <div
        className="h-1 rounded overflow-hidden"
        style={{ background: "#0a0a0a" }}
      >
        <div
          className="h-full rounded transition-all"
          style={{
            width: `${Math.min(pct, 100)}%`,
            background: color,
            opacity: 0.7,
          }}
        />
      </div>
    </div>
  );
}

function Mini({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "bad" | "neutral";
}) {
  const c = tone === "bad" ? "#ef4444" : "#e5e5e5";
  return (
    <div
      className="rounded p-2.5"
      style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}
    >
      <div className="text-xs mb-0.5" style={{ color: "#e5e5e5" }}>
        {label}
      </div>
      <div className="text-sm font-semibold font-mono" style={{ color: c }}>
        {value}
      </div>
    </div>
  );
}

function topN(dist: DistMap, n: number): [string, number][] {
  return Object.entries(dist)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupBySession(events: Event[]) {
  const map = new Map<string, Event[]>();
  const order: string[] = [];
  for (const e of events) {
    const key = e.session_id ?? "__none__";
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(e);
  }
  return order.map((k) => ({
    sessionId: k === "__none__" ? null : k,
    events: map.get(k)!,
  }));
}

function eventColor(type: string): string {
  const map: Record<string, string> = {
    tool_call: "#3b82f6",
    user_message: "#8b5cf6",
    assistant: "#8b5cf6",
    agent_response: "#22c55e",
    error: "#ef4444",
    knowledge: "#f59e0b",
    conversation: "#06b6d4",
    handoff: "#06b6d4",
    generation_start: "#a78bfa",
    post_generated: "#34d399",
    image_generated: "#fb923c",
  };
  return map[type] ?? "#e5e5e5";
}

function EventDot({ type, size = "md" }: { type: string; size?: "sm" | "md" }) {
  const s = size === "sm" ? "w-1.5 h-1.5 mt-1.5" : "w-2 h-2 mt-1";
  return (
    <div
      className={`${s} rounded-full shrink-0`}
      style={{ background: eventColor(type) }}
    />
  );
}

function FilterPill({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-2.5 py-1 rounded-full transition"
      style={{
        background: active ? `${color ?? "#22c55e"}20` : "#111",
        color: active ? (color ?? "#22c55e") : "#e5e5e5",
        border: `1px solid ${active ? (color ?? "#22c55e") + "40" : "#1f1f1f"}`,
      }}
    >
      {label}
    </button>
  );
}

function PanelTabBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-2 text-xs font-medium transition"
      style={{
        background: active ? "#1a1a1a" : "transparent",
        color: active ? "#e5e5e5" : "#e5e5e5",
      }}
    >
      {label}
    </button>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span
        className="font-mono shrink-0"
        style={{ color: "#e5e5e5", minWidth: 80 }}
      >
        {label}
      </span>
      <span className="font-mono break-all" style={{ color: "#e5e5e5" }}>
        {value}
      </span>
    </div>
  );
}

function Shell({
  agentId,
  lastSync,
  onDelete,
  deleting,
  children,
}: {
  agentId: string;
  lastSync?: Date | null;
  onDelete?: () => void;
  deleting?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <button
        onClick={() => router.push("/dashboard")}
        className="flex items-center gap-1.5 text-sm mb-6 transition"
        style={{ color: "#e5e5e5" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#e5e5e5")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#e5e5e5")}
      >
        <ChevronLeft size={15} /> Agents
      </button>
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-white font-semibold text-xl font-mono">
          {agentId}
        </h1>
        <div className="flex items-center gap-3 shrink-0">
          {lastSync && (
            <div
              className="flex items-center gap-2 text-xs"
              style={{ color: "#e5e5e5" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "#22c55e" }}
              />
              Live · {formatDistanceToNow(lastSync, { addSuffix: true })}
            </div>
          )}
          {onDelete && (
            <button
              type="button"
              disabled={deleting}
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs disabled:opacity-40"
              style={{
                background: "#1a1a1a",
                color: "#f87171",
                border: "1px solid #2a2a2a",
              }}
            >
              <Trash2 size={13} />
              {deleting ? "Deleting…" : "Delete agent"}
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-14 rounded-lg animate-pulse"
          style={{ background: "#111" }}
        />
      ))}
    </div>
  );
}
