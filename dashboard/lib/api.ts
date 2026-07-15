// NEXT_PUBLIC_ prefix makes this available in the browser.
// Falls back to '' (relative URL) so Nginx can route /v1/ → FastAPI.
export const API = process.env.NEXT_PUBLIC_API_URL ?? ''

export class AuthRequestError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'AuthRequestError'
    this.status = status
  }
}

function formatApiError(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((d) => (typeof d === 'object' && d && 'msg' in d ? String((d as { msg: string }).msg) : String(d))).join('; ')
  }
  if (detail && typeof detail === 'object' && 'msg' in detail) return String((detail as { msg: string }).msg)
  return fallback
}

// Default `T = any` preserves the exact pre-existing untyped behavior for any
// call site that doesn't opt into an explicit type — this is additive only.
async function apiFetch<T = any>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(formatApiError(err.detail, res.statusText || 'API error'))
  }
  return res.json()
}

// ─────────────────────────────────────────────────────────────────────────────
// Agents
// ─────────────────────────────────────────────────────────────────────────────

export interface Agent {
  agent: string
  first_seen: string
  last_seen: string
  event_count: number
  api_key_count?: number
}

export interface CreateAgentResponse {
  agent?: string
  api_key?: { key: string; key_id?: string; prefix?: string }
  message?: string
}

export async function getAgents(token: string): Promise<Agent[]> {
  return apiFetch('/v1/agents', token)
}

export async function createAgent(token: string, agentId: string, keyName?: string): Promise<CreateAgentResponse> {
  return apiFetch('/v1/agents', token, {
    method: 'POST',
    body: JSON.stringify({ agent_id: agentId, key_name: keyName }),
  })
}

export async function deleteAgent(token: string, agentId: string): Promise<{ message?: string }> {
  return apiFetch(`/v1/agents/${encodeURIComponent(agentId)}`, token, {
    method: 'DELETE',
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent-scoped API keys
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiKey {
  key_id: string
  prefix: string
  name: string | null
  agent_id: string | null
  created_at: string
  last_used: string | null
}

export interface CreateKeyResponse {
  key: string
  key_id?: string
  prefix: string
  name: string | null
}

export async function getAgentApiKeys(token: string, agentId: string): Promise<ApiKey[]> {
  return apiFetch(`/v1/agents/${encodeURIComponent(agentId)}/api-keys`, token)
}

export async function createAgentApiKey(token: string, agentId: string, name?: string): Promise<CreateKeyResponse> {
  return apiFetch(`/v1/agents/${encodeURIComponent(agentId)}/api-keys`, token, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function revokeAgentApiKey(token: string, agentId: string, keyId: string): Promise<{ message?: string }> {
  return apiFetch(
    `/v1/agents/${encodeURIComponent(agentId)}/api-keys/${encodeURIComponent(keyId)}`,
    token,
    { method: 'DELETE' },
  )
}

export async function sendTestEvent(token: string): Promise<{ message?: string; event_id?: string }> {
  return apiFetch('/v1/auth/test-event', token, { method: 'POST' })
}

export async function sendAgentTestEvent(token: string, agentId: string): Promise<{ message?: string }> {
  return apiFetch(`/v1/agents/${encodeURIComponent(agentId)}/test-event`, token, {
    method: 'POST',
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Events, search, sessions, memory, time-travel
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentEvent {
  event_id: string
  agent: string
  timestamp: string
  event: string
  data: Record<string, unknown>
  parent_id: string | null
  session_id: string | null
  sequence_no: number
}

export interface AgentStats {
  total_events: number
  unique_event_types: number
  sessions: number
  first_event: string | null
  last_event: string | null
  top_events: { event: string; count: number }[]
}

export interface WhyChain {
  event_id: string
  chain_length: number
  chain: AgentEvent[]
}

export interface AgentSession {
  session_id: string
  event_count: number
  event_types: number
  started_at: string
  ended_at: string
  duration_seconds: number
  types: string[]
}

export async function getAgentStats(token: string, agentId: string): Promise<AgentStats> {
  return apiFetch(`/v1/agents/${encodeURIComponent(agentId)}/stats`, token)
}

export async function getEvents(
  token: string,
  agent: string,
  params: Record<string, string> = {},
): Promise<AgentEvent[]> {
  const qs = new URLSearchParams({ agent, ...params }).toString()
  const data = await apiFetch<AgentEvent[] | { events?: AgentEvent[] }>(`/v1/events?${qs}`, token)
  // API returns either an array directly or { events: [] }
  return Array.isArray(data) ? data : data.events ?? []
}

export async function getWhyChain(token: string, eventId: string): Promise<WhyChain> {
  return apiFetch(`/v1/events/${eventId}/why`, token)
}

// The backend's search response shape isn't fully pinned down (some call
// sites defensively handle both `{ results: [...] }` and a bare array) — kept
// loosely typed here rather than forcing a shape that would fight that
// existing, intentional defensiveness.
export async function searchEvents(token: string, query: string, agent?: string) {
  return apiFetch('/v1/search', token, {
    method: 'POST',
    body: JSON.stringify({ query, agent, limit: 20 }),
  })
}

export async function getAgentSessions(token: string, agentId: string): Promise<AgentSession[]> {
  return apiFetch(`/v1/agents/${encodeURIComponent(agentId)}/sessions`, token)
}

export async function getMemoryDiff(token: string, sessionId: string): Promise<Record<string, unknown>> {
  return apiFetch(`/v1/memory/diff/${encodeURIComponent(sessionId)}`, token)
}

export async function timeTravel(token: string, agent: string, timestamp: string): Promise<Record<string, unknown>> {
  const qs = new URLSearchParams({ agent, timestamp }).toString()
  return apiFetch(`/v1/events/at?${qs}`, token)
}

// ─────────────────────────────────────────────────────────────────────────────
// Embeddings
// ─────────────────────────────────────────────────────────────────────────────

export interface EmbeddingCatalogEntry {
  id: string
  models: { id: string; label: string; description?: string }[]
}

export interface EmbeddingSettings {
  provider?: string
  model?: string
  use_platform_key?: boolean
  ready?: boolean
}

export async function getEmbeddingCatalog(): Promise<{ providers?: EmbeddingCatalogEntry[] }> {
  return apiFetch('/v1/settings/embeddings/catalog', '')
}

export async function getEmbeddingSettings(token: string): Promise<EmbeddingSettings> {
  return apiFetch('/v1/settings/embeddings', token)
}

export async function updateEmbeddingSettings(
  token: string,
  body: {
    provider: string
    model: string
    use_platform_key: boolean
    api_key?: string
  },
): Promise<{ message?: string }> {
  return apiFetch('/v1/settings/embeddings', token, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Baseline / drift
// ─────────────────────────────────────────────────────────────────────────────

export interface BaselineWindow {
  sessions: number
  events: number
  event_distribution: Record<string, number>
  transitions: Record<string, number>
  avg_events_per_session: number
  avg_session_seconds: number
  error_rate_pct: number
}

export interface BaselineChange {
  metric: string
  baseline: number
  recent: number
  delta_pp: number
}

export interface AgentBaseline {
  agent: string
  status: 'ok' | 'warming_up' | 'insufficient_data'
  message?: string
  sessions: number
  recent_window: number
  baseline?: BaselineWindow
  recent?: BaselineWindow
  drift?: {
    score: number
    behavior_change_pct: number
    verdict: 'stable' | 'minor_drift' | 'noticeable_drift' | 'significant_drift'
    biggest_changes: BaselineChange[]
    error_rate_change_pp: number
    session_length_change_pct: number
  }
}

export async function getAgentBaseline(
  token: string,
  agentId: string,
  recentWindow = 50,
  window?: '24h' | '7d' | '30d',
): Promise<AgentBaseline> {
  const qs = new URLSearchParams({ recent_window: String(recentWindow) })
  if (window) qs.set('window', window)
  return apiFetch(
    `/v1/agents/${encodeURIComponent(agentId)}/baseline?${qs.toString()}`,
    token,
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin (single-tenant; locked to founder@zizka.ai by the backend)
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminOverview {
  telemetry: { total_installs?: number; active_7d?: number; active_24h?: number; total_pings?: number }
  managed: { users?: number; tenants?: number; active_keys?: number; total_events?: number; events_24h?: number }
}

export interface AdminTelemetrySummary {
  by_sdk: { sdk: string; installs: number; pings: number }[]
  by_mode: { mode: string; installs: number }[]
  by_os: { os: string; installs: number }[]
  by_version: { sdk: string; sdk_version: string; installs: number }[]
  daily_new_installs: { day: string; new_installs: number }[]
}

export interface AdminTelemetryPing {
  install_id: string
  sdk: string
  sdk_version: string
  runtime: string
  os: string
  mode: string
  first_seen: string
  last_seen: string
  ping_count: number
}

export interface ManagedApiKey {
  name: string
  prefix: string
  created_at: string | null
  last_used: string | null
}

export interface ManagedUser {
  user_id: string
  email: string
  tenant_id: string | null
  tenant_name: string | null
  tenant_created_at: string | null
  created_at: string | null
  last_login: string | null
  active_keys: number
  agent_count: number
  total_events: number
  events_7d: number
  last_event: string | null
  api_keys: ManagedApiKey[]
  customer_status: 'active' | 'signed_up' | 'registered'
  plan: string | null
  subscription_status: string | null
  trial_ends_at: string | null
}

export interface ManagedOverview {
  total_users?: number
  signups_7d?: number
  subscribers?: number
  trialing?: number
  active_paid?: number
  users_with_keys?: number
  tenants_active_7d?: number
}

export interface Subscriber {
  user_id: string
  email: string
  plan: string | null
  subscription_status: string | null
  trial_ends_at: string | null
  created_at: string | null
  last_login: string | null
  tenant_id: string | null
  tenant_name: string | null
  active_keys: number
  events_7d: number
}

export interface ManagedUsage {
  daily: { day: string; events: number; tenants_active: number }[]
  top_tenants_7d: { tenant_id: string; name: string; owner: string | null; events_7d: number }[]
}

export interface DemoRequest {
  request_id: string
  first_name: string
  last_name: string
  email: string
  company_name: string
  website: string
  position: string | null
  source: string | null
  ip_address: string | null
  created_at: string | null
}

export async function adminRequestOtp(email: string, signal?: AbortSignal): Promise<{ message?: string }> {
  const res = await fetch(`${API}/v1/admin/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
    signal,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'Request failed')
  }
  return res.json()
}

export async function adminVerifyOtp(email: string, otp: string): Promise<{ access_token: string; token_type?: string }> {
  const res = await fetch(`${API}/v1/admin/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  })
  if (!res.ok) throw new Error('Invalid code')
  return res.json()
}

export async function adminOverview(token: string): Promise<AdminOverview> {
  return apiFetch('/v1/admin/overview', token)
}

export async function adminTelemetrySummary(token: string): Promise<AdminTelemetrySummary> {
  return apiFetch('/v1/admin/telemetry/summary', token)
}

export async function adminTelemetryRecent(token: string, limit = 50): Promise<AdminTelemetryPing[]> {
  return apiFetch(`/v1/admin/telemetry/recent?limit=${limit}`, token)
}

export async function adminManagedOverview(token: string): Promise<ManagedOverview> {
  return apiFetch('/v1/admin/managed/overview', token)
}

export async function adminManagedSubscribers(
  token: string,
  params: { search?: string; status?: string } = {},
): Promise<Subscriber[]> {
  const qs = new URLSearchParams()
  if (params.search?.trim()) qs.set('search', params.search.trim())
  if (params.status?.trim()) qs.set('status', params.status.trim())
  const q = qs.toString()
  return apiFetch(`/v1/admin/managed/subscribers${q ? `?${q}` : ''}`, token)
}

export async function adminManagedUsers(
  token: string,
  params: { search?: string; has_keys?: boolean; active_7d?: boolean } = {},
): Promise<ManagedUser[]> {
  const qs = new URLSearchParams()
  if (params.search?.trim()) qs.set('search', params.search.trim())
  if (params.has_keys === true) qs.set('has_keys', 'true')
  if (params.has_keys === false) qs.set('has_keys', 'false')
  if (params.active_7d === true) qs.set('active_7d', 'true')
  if (params.active_7d === false) qs.set('active_7d', 'false')
  const q = qs.toString()
  return apiFetch(`/v1/admin/managed/users${q ? `?${q}` : ''}`, token)
}

export async function adminManagedUsage(token: string): Promise<ManagedUsage> {
  return apiFetch('/v1/admin/managed/usage', token)
}

export async function adminDemoRequests(token: string, params: { search?: string; limit?: number } = {}): Promise<DemoRequest[]> {
  const qs = new URLSearchParams()
  if (params.search?.trim()) qs.set('search', params.search.trim())
  if (params.limit) qs.set('limit', String(params.limit))
  const q = qs.toString()
  return apiFetch(`/v1/admin/demo-requests${q ? `?${q}` : ''}`, token)
}

export async function adminMarketingSubscriptions(
  token: string,
  params: { search?: string; limit?: number } = {},
) {
  const qs = new URLSearchParams()
  if (params.search?.trim()) qs.set('search', params.search.trim())
  if (params.limit) qs.set('limit', String(params.limit))
  const q = qs.toString()
  return apiFetch(`/v1/admin/marketing-subscriptions${q ? `?${q}` : ''}`, token)
}

export async function getApiKeys(token: string) {
  return apiFetch('/v1/auth/api-keys', token)
}

export async function createApiKey(token: string, name: string): Promise<CreateKeyResponse> {
  return apiFetch('/v1/auth/api-keys', token, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function revokeApiKey(token: string, keyId: string): Promise<{ message?: string }> {
  return apiFetch(`/v1/auth/api-keys/${encodeURIComponent(keyId)}`, token, {
    method: 'DELETE',
  })
}

export interface ApiKeyUsage {
  plan: string | null
  limit: number | null
  used: number
  unlimited: boolean
  at_limit: boolean
}

// Account-wide API key quota for the current plan. The backend is the source of
// truth for the limit, so the UI never hardcodes plan limits.
export async function getApiKeyUsage(token: string): Promise<ApiKeyUsage> {
  return apiFetch('/v1/auth/api-keys/usage', token)
}

export async function requestOtp(email: string, intent: 'signup' | 'login' = 'login') {
  const res = await fetch(`${API}/v1/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.toLowerCase().trim(),
      intent,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new AuthRequestError(
      formatApiError(err.detail, 'Failed to send code'),
      res.status,
    )
  }
  return res.json()
}

export async function verifyOtp(
  email: string,
  otp: string,
  opts?: {
    intent?: 'signup' | 'login'
    gdprConsent?: boolean
    marketingConsent?: boolean
  },
) {
  const intent = opts?.intent ?? 'login'
  const res = await fetch(`${API}/v1/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.toLowerCase().trim(),
      otp: otp.trim(),
      intent,
      ...(opts?.gdprConsent ? { gdpr_consent: true } : {}),
      ...(opts?.marketingConsent ? { marketing_consent: true } : {}),
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new AuthRequestError(
      formatApiError(err.detail, 'Invalid or expired code'),
      res.status,
    )
  }
  const data = await res.json()
  if (!data?.access_token) throw new Error('Sign-in succeeded but no session token was returned')
  return data as {
    access_token: string
    token_type: string
    requires_plan_selection?: boolean
    requires_checkout?: boolean
    has_access?: boolean
    plan?: string | null
  }
}

// Self-host local dev only — issues a token for the default dev tenant.
export async function devLogin(): Promise<{ access_token: string }> {
  const res = await fetch(`${API}/v1/auth/dev-token`, { method: 'POST' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new AuthRequestError(
      formatApiError(err.detail, 'Dev token failed'),
      res.status,
    )
  }
  return res.json()
}

export interface BillingStatus {
  enforced: boolean
  has_access: boolean
  requires_plan_selection: boolean
  requires_checkout: boolean
  subscription_status: string | null
  trial_ends_at: string | null
  plan: string | null
  trial_days?: number | null
}

export async function getBillingStatus(token: string): Promise<BillingStatus> {
  return apiFetch('/v1/billing/status', token)
}

export async function selectBillingPlan(token: string, plan: 'pro' | 'team'): Promise<BillingStatus> {
  return apiFetch('/v1/billing/select-plan', token, {
    method: 'POST',
    body: JSON.stringify({ plan }),
  })
}


export interface AccountOptions {
  managed_cloud: boolean
  retention_trial_available?: boolean
  retention_trial_days?: number
  trial_ends_at?: string | null
  email?: string | null
}

export async function getAccountOptions(token: string): Promise<AccountOptions> {
  return apiFetch('/v1/account/options', token)
}

export async function grantRetentionTrial(token: string): Promise<{
  message: string
  trial_ends_at: string
  retention_trial_available: boolean
}> {
  return apiFetch('/v1/account/retention-trial', token, { method: 'POST' })
}

export async function deleteManagedAccount(token: string): Promise<{ message: string }> {
  return apiFetch('/v1/account', token, { method: 'DELETE' })
}
