/**
 * ZizkaDB TypeScript SDK
 *
 * @example
 * import { ZizkaDB } from 'zizkadb-sdk'
 *
 * // Cloud
 * const db = new ZizkaDB({ apiKey: 'zizkadb_live_xxxx' })
 *
 * // Self-hosted
 * const db = new ZizkaDB({ host: 'http://localhost:8000' })
 *
 * // Log an event
 * const result = await db.log({
 *   agent: 'my-bot',
 *   event: 'tool_call',
 *   data: { tool: 'search', query: '...' },
 * })
 *
 * // Why did something happen?
 * const chain = await db.why(result.eventId)
 * chain.print()
 */

import type {
  ZizkaDBConfig,
  AgentEvent,
  AgentInfo,
  AgentState,
  AtOptions,
  CausalChain,
  LogOptions,
  LogResult,
  QueryOptions,
  SearchOptions,
} from './types'
import { ZizkaDBError, AuthError, NotFoundError, AgentScopeError, RateLimitError } from './types'

export * from './types'

const CLOUD_HOST = 'https://db.zizka.ai'
const TELEMETRY_URL = 'https://db.zizka.ai/v1/telemetry'
const SDK_VERSION = '0.2.5'
const DEFAULT_DEV_API_KEY = 'zizkadb_dev_local'

function isLocalHost(host: string): boolean {
  const h = host.toLowerCase()
  return h.includes('localhost') || h.includes('127.0.0.1') || h.includes('0.0.0.0')
}

/** ZIZKADB_API_KEY preferred; AGENTDB_API_KEY for legacy managed-cloud users. */
function apiKeyFromEnv(): string | undefined {
  return process.env.ZIZKADB_API_KEY ?? process.env.AGENTDB_API_KEY
}

let _telemetrySent = false

function _sendTelemetry(mode: 'cloud' | 'self-hosted'): void {
  if (_telemetrySent) return
  if (
    typeof process !== 'undefined' &&
    /^(false|0|no|off)$/i.test(process.env.ZIZKADB_TELEMETRY ?? '')
  ) return

  _telemetrySent = true

  const payload = {
    install_id:  _getInstallId(),
    sdk:         'typescript',
    sdk_version: SDK_VERSION,
    node:        typeof process !== 'undefined' ? process.version : 'unknown',
    os:          typeof process !== 'undefined' ? process.platform : 'unknown',
    mode,
  }

  // Fire and forget — never awaited, never throws
  try {
    fetch(TELEMETRY_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(3000),
    }).catch(() => {})
  } catch {
    // ignore
  }
}

function _getInstallId(): string {
  try {
    // Node.js environment — persist to ~/.zizkadb/install_id
    const { homedir } = require('os') as typeof import('os')
    const { mkdirSync, readFileSync, writeFileSync, existsSync } = require('fs') as typeof import('fs')
    const { join } = require('path') as typeof import('path')
    const dir = join(homedir(), '.zizkadb')
    const file = join(dir, 'install_id')
    mkdirSync(dir, { recursive: true })
    if (existsSync(file)) {
      const id = readFileSync(file, 'utf8').trim()
      if (id) return id
    }
    const id = _uuid()
    writeFileSync(file, id)
    return id
  } catch {
    return _uuid()
  }
}

function _uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

function formatFastApiDetail(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (item && typeof item === 'object' && 'msg' in item) {
          return String((item as { msg: unknown }).msg)
        }
        return JSON.stringify(item)
      })
      .join('; ')
  }
  if (detail && typeof detail === 'object') return JSON.stringify(detail)
  if (detail == null) return fallback
  return String(detail)
}

export class ZizkaDB {
  private readonly baseUrl: string
  private readonly headers: Record<string, string>
  private readonly timeout: number

  constructor(config: ZizkaDBConfig) {
    if (!config.apiKey && !config.host) {
      throw new ZizkaDBError(
        'Provide an apiKey (cloud) or host (self-hosted).\n' +
        '  Cloud:       new ZizkaDB({ apiKey: "zizkadb_live_..." })\n' +
        '  Self-hosted: new ZizkaDB({ host: "http://localhost:8000" })',
      )
    }

    this.baseUrl = config.host?.replace(/\/$/, '') ?? CLOUD_HOST
    this.timeout = config.timeout ?? 10_000

    let apiKey = config.apiKey
    if (!apiKey && config.host) {
      if (isLocalHost(config.host)) {
        apiKey =
          apiKeyFromEnv() ??
          process.env.DEV_API_KEY ??
          DEFAULT_DEV_API_KEY
      } else {
        apiKey = apiKeyFromEnv()
        if (!apiKey) {
          throw new ZizkaDBError(
            `Cloud host requires an apiKey or ZIZKADB_API_KEY env var. Host: ${config.host}`,
          )
        }
      }
    }

    this.headers = {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    }

    _sendTelemetry(config.host ? 'self-hosted' : 'cloud')
  }

  // ─────────────────────────────────────────
  // LOG
  // ─────────────────────────────────────────

  async log(options: LogOptions): Promise<LogResult> {
    const res = await this.post('/v1/events', {
      agent: options.agent,
      event: options.event,
      data: options.data,
      parent_id: options.parentId ?? null,
      session_id: options.sessionId ?? null,
      metadata: options.metadata ?? null,
    }) as {
      event_id: string
      timestamp: string
      sequence_no: number
      checksum: string
    }
    return {
      eventId: res.event_id,
      timestamp: new Date(res.timestamp),
      sequenceNo: res.sequence_no,
      checksum: res.checksum,
    }
  }

  // ─────────────────────────────────────────
  // QUERY
  // ─────────────────────────────────────────

  async query(options: QueryOptions): Promise<AgentEvent[]> {
    const params: Record<string, string> = {
      agent: options.agent,
      limit: String(options.limit ?? 50),
    }
    if (options.before) params.before = options.before.toISOString()
    if (options.after) params.after = options.after.toISOString()
    if (options.eventType) params.event_type = options.eventType
    if (options.sessionId) params.session_id = options.sessionId

    const res = await this.get('/v1/events', params) as Record<string, unknown>[]
    return res.map(parseEvent)
  }

  // ─────────────────────────────────────────
  // WHY
  // ─────────────────────────────────────────

  async why(eventId: string, depth = 10): Promise<CausalChain> {
    const res = await this.get(`/v1/events/${eventId}/why`, {
      depth: String(depth),
    }) as {
      event_id: string
      chain_length: number
      chain: Record<string, unknown>[]
    }
    const chain = res.chain.map(parseEvent)

    return {
      eventId: res.event_id,
      chainLength: res.chain_length,
      chain,
      print() {
        if (chain.length === 0) {
          console.log('(empty chain)')
          return
        }
        chain.forEach((event: AgentEvent, i: number) => {
          const indent = '    '.repeat(i)
          let connector = ''
          if (i > 0) {
            connector = i === chain.length - 1 ? '└── ' : '├── '
          }
          const data = JSON.stringify(event.data).slice(0, 60)
          const time = event.timestamp.toTimeString().slice(0, 8)
          console.log(`${indent}${connector}${event.event}: ${data}  [${time}]`)
        })
      },
    }
  }

  // ─────────────────────────────────────────
  // SEARCH
  // ─────────────────────────────────────────

  async search(options: SearchOptions): Promise<AgentEvent[]> {
    const res = await this.post('/v1/search', {
      query: options.query,
      agent: options.agent ?? null,
      limit: options.limit ?? 10,
    }) as { results: Record<string, unknown>[] }
    return res.results.map(parseEvent)
  }

  // ─────────────────────────────────────────
  // AT (time travel)
  // ─────────────────────────────────────────

  async at(options: AtOptions): Promise<AgentState> {
    const res = await this.get('/v1/events/at', {
      agent: options.agent,
      timestamp: options.timestamp.toISOString(),
    }) as {
      agent: string
      at: string
      event_count: number
      state: Record<string, unknown>
    }
    return {
      agent: res.agent,
      at: new Date(res.at),
      eventCount: res.event_count,
      state: res.state,
    }
  }

  // ─────────────────────────────────────────
  // CONTEXT FOR — prompt-ready memory injection
  // ─────────────────────────────────────────

  /**
   * Get a formatted memory block ready to inject into a system prompt.
   * Combines recent events + semantically relevant past events.
   *
   * @example
   * const context = await db.contextFor({
   *   agent: 'support-bot',
   *   task: 'user asking about their invoice',
   * })
   * const messages = [
   *   { role: 'system', content: `You are a support agent.\n\n${context}` },
   *   { role: 'user',   content: userMessage },
   * ]
   */
  async contextFor(options: {
    agent: string
    task: string
    maxTokens?: number
    sessionId?: string
  }): Promise<string> {
    const res = await this.post('/v1/memory/context', {
      agent: options.agent,
      task: options.task,
      max_tokens: options.maxTokens ?? 2000,
      session_id: options.sessionId ?? null,
    }) as Record<string, unknown>
    return (res.context as string) ?? ''
  }

  /**
   * Same as contextFor() but returns full metadata including source events and token count.
   */
  async contextForFull(options: {
    agent: string
    task: string
    maxTokens?: number
    sessionId?: string
  }): Promise<{ context: string; eventCount: number; estimatedTokens: number; sources: unknown[] }> {
    const res = await this.post('/v1/memory/context', {
      agent: options.agent,
      task: options.task,
      max_tokens: options.maxTokens ?? 2000,
      session_id: options.sessionId ?? null,
    }) as Record<string, unknown>
    return {
      context: res.context as string,
      eventCount: res.event_count as number,
      estimatedTokens: res.estimated_tokens as number,
      sources: res.sources as unknown[],
    }
  }

  // ─────────────────────────────────────────
  // MEMORY DIFF — what changed after a session
  // ─────────────────────────────────────────

  /**
   * Returns a summary of what happened in a session.
   * Useful after a session ends to understand what patterns emerged.
   *
   * @example
   * const diff = await db.memoryDiff('sess_abc')
   * console.log(diff.summary)
   * if (diff.hasErrors) console.warn('Errors detected in session')
   */
  async memoryDiff(sessionId: string): Promise<{
    sessionId: string
    agent: string
    eventCount: number
    eventTypes: Record<string, number>
    causalDepth: number
    hasErrors: boolean
    durationSeconds: number | null
    newEventTypes: string[]
    summary: string
  }> {
    const res = await this.get(`/v1/memory/diff/${sessionId}`, {}) as Record<string, unknown>
    return {
      sessionId: res.session_id as string,
      agent: res.agent as string,
      eventCount: res.event_count as number,
      eventTypes: res.event_types as Record<string, number>,
      causalDepth: res.causal_depth as number,
      hasErrors: res.has_errors as boolean,
      durationSeconds: res.duration_seconds as number | null,
      newEventTypes: res.new_event_types as string[],
      summary: res.summary as string,
    }
  }

  // ─────────────────────────────────────────
  // FORGET — GDPR compliance
  // ─────────────────────────────────────────

  /**
   * Delete all events where data[filterKey] === filterValue.
   * Also removes vectors from the search index.
   * Use for GDPR right-to-erasure requests.
   *
   * @example
   * const result = await db.forget({ filterKey: 'user_id', filterValue: 'user_123' })
   * console.log(`Deleted ${result.deletedEvents} events`)
   */
  async forget(options: {
    filterKey: string
    filterValue: string
  }): Promise<{ deletedEvents: number; message: string }> {
    const res = await this.delete('/v1/memory/forget', {
      filter_key: options.filterKey,
      filter_value: options.filterValue,
    }) as Record<string, unknown>
    return {
      deletedEvents: res.deleted_events as number,
      message: res.message as string,
    }
  }

  // ─────────────────────────────────────────
  // AGENTS
  // ─────────────────────────────────────────

  async agents(): Promise<AgentInfo[]> {
    const res = await this.get('/v1/agents', {})
    return (res as Record<string, unknown>[]).map((a) => ({
      agent: a.agent as string,
      firstSeen: new Date(a.first_seen as string),
      lastSeen: new Date(a.last_seen as string),
      eventCount: a.event_count as number,
    }))
  }

  // ─────────────────────────────────────────
  // BASELINE — behavioral baseline + drift signal
  // ─────────────────────────────────────────

  /**
   * Get the behavioral baseline for an agent.
   *
   * Splits this agent's sessions into two windows: the most recent N
   * sessions (`recent`) and everything older (`baseline`). Returns event-type
   * distribution, parent->child transition distribution, average session
   * shape, and error rate for each window, plus a drift score (0 = identical,
   * 1 = totally different) and the biggest behavioural changes between the
   * two windows.
   *
   * Use this to answer "has this agent started behaving differently since I
   * shipped v2?" before users notice.
   *
   * @example
   * const b = await db.baseline({ agent: 'support-bot' })
   * if (b.drift && b.drift.score > 0.15) {
   *   console.warn('Drift detected:', b.drift.biggest_changes)
   * }
   */
  async baseline(options: {
    agent: string
    recentWindow?: number
  }): Promise<Record<string, unknown>> {
    const res = await this.get(`/v1/agents/${options.agent}/baseline`, {
      recent_window: String(options.recentWindow ?? 50),
    })
    return res as Record<string, unknown>
  }

  // ─────────────────────────────────────────
  // HTTP HELPERS
  // ─────────────────────────────────────────

  private async post(path: string, body: unknown): Promise<unknown> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeout)

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      return this.handle(res)
    } finally {
      clearTimeout(timer)
    }
  }

  private async get(
    path: string,
    params: Record<string, string>,
  ): Promise<unknown> {
    const qs = new URLSearchParams(params).toString()
    const url = qs ? `${this.baseUrl}${path}?${qs}` : `${this.baseUrl}${path}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeout)

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: this.headers,
        signal: controller.signal,
      })
      return this.handle(res)
    } finally {
      clearTimeout(timer)
    }
  }

  private async delete(path: string, body: unknown): Promise<unknown> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeout)
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'DELETE',
        headers: this.headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      return this.handle(res)
    } finally {
      clearTimeout(timer)
    }
  }

  private async handle(res: Response): Promise<unknown> {
    if (res.status === 401) {
      throw new AuthError(
        'Invalid API key. Create an agent at db.zizka.ai/dashboard and copy its key.',
      )
    }
    if (res.status === 403) {
      let detail = res.statusText
      try {
        const json = await res.json() as Record<string, unknown>
        detail = formatFastApiDetail(json.detail, detail)
      } catch {}
      throw new AgentScopeError(`Agent mismatch (403): ${detail}`)
    }
    if (res.status === 404) {
      throw new NotFoundError('Resource not found')
    }
    if (res.status === 429) {
      throw new RateLimitError('Rate limit exceeded')
    }
    if (res.status >= 400) {
      let detail = res.statusText
      try {
        const json = await res.json() as Record<string, unknown>
        detail = formatFastApiDetail(json.detail, detail)
      } catch {}
      throw new ZizkaDBError(`ZizkaDB error (${res.status}): ${detail}`, res.status)
    }
    return res.json()
  }
}

function parseEvent(e: Record<string, unknown>): AgentEvent {
  return {
    eventId: e.event_id as string,
    agent: e.agent as string,
    timestamp: new Date(e.timestamp as string),
    event: e.event as string,
    data: e.data as Record<string, unknown>,
    parentId: (e.parent_id as string) ?? null,
    sessionId: (e.session_id as string) ?? null,
    sequenceNo: e.sequence_no as number,
    score: e.score as number | undefined,
  }
}
