// NEXT_PUBLIC_ prefix makes this available in the browser.
// Falls back to '' (relative URL) so Nginx can route /v1/ → FastAPI.
const API = process.env.NEXT_PUBLIC_API_URL ?? ''

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

async function apiFetch(path: string, token: string, options: RequestInit = {}) {
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

export async function getAgents(token: string) {
  return apiFetch('/v1/agents', token)
}

export async function createAgent(token: string, agentId: string, keyName?: string) {
  return apiFetch('/v1/agents', token, {
    method: 'POST',
    body: JSON.stringify({ agent_id: agentId, key_name: keyName }),
  })
}

export async function getAgentApiKeys(token: string, agentId: string) {
  return apiFetch(`/v1/agents/${encodeURIComponent(agentId)}/api-keys`, token)
}

export async function createAgentApiKey(token: string, agentId: string, name?: string) {
  return apiFetch(`/v1/agents/${encodeURIComponent(agentId)}/api-keys`, token, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function revokeAgentApiKey(token: string, agentId: string, keyId: string) {
  return apiFetch(
    `/v1/agents/${encodeURIComponent(agentId)}/api-keys/${encodeURIComponent(keyId)}`,
    token,
    { method: 'DELETE' },
  )
}

export async function deleteAgent(token: string, agentId: string) {
  return apiFetch(`/v1/agents/${encodeURIComponent(agentId)}`, token, {
    method: 'DELETE',
  })
}

export async function sendTestEvent(token: string) {
  return apiFetch('/v1/auth/test-event', token, { method: 'POST' })
}

export async function sendAgentTestEvent(token: string, agentId: string) {
  return apiFetch(`/v1/agents/${encodeURIComponent(agentId)}/test-event`, token, {
    method: 'POST',
  })
}

export async function getAgentStats(token: string, agentId: string) {
  return apiFetch(`/v1/agents/${encodeURIComponent(agentId)}/stats`, token)
}

export async function getEvents(
  token: string,
  agent: string,
  params: Record<string, string> = {},
) {
  const qs = new URLSearchParams({ agent, ...params }).toString()
  const data = await apiFetch(`/v1/events?${qs}`, token)
  // API returns either an array directly or { events: [] }
  return Array.isArray(data) ? data : (data as { events?: unknown[] }).events ?? []
}

export async function getWhyChain(token: string, eventId: string) {
  return apiFetch(`/v1/events/${eventId}/why`, token)
}

export async function searchEvents(token: string, query: string, agent?: string) {
  return apiFetch('/v1/search', token, {
    method: 'POST',
    body: JSON.stringify({ query, agent, limit: 20 }),
  })
}

export async function getAgentSessions(token: string, agentId: string) {
  return apiFetch(`/v1/agents/${encodeURIComponent(agentId)}/sessions`, token)
}

export async function getMemoryDiff(token: string, sessionId: string) {
  return apiFetch(`/v1/memory/diff/${encodeURIComponent(sessionId)}`, token)
}

export async function timeTravel(token: string, agent: string, timestamp: string) {
  const qs = new URLSearchParams({ agent, timestamp }).toString()
  return apiFetch(`/v1/events/at?${qs}`, token)
}

export async function getEmbeddingCatalog() {
  return apiFetch('/v1/settings/embeddings/catalog', '')
}

export async function getEmbeddingSettings(token: string) {
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
) {
  return apiFetch('/v1/settings/embeddings', token, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function getAgentBaseline(
  token: string,
  agentId: string,
  recentWindow = 50,
  window?: '24h' | '7d' | '30d',
) {
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

export async function adminRequestOtp(email: string, signal?: AbortSignal) {
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

export async function adminVerifyOtp(email: string, otp: string) {
  const res = await fetch(`${API}/v1/admin/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  })
  if (!res.ok) throw new Error('Invalid code')
  return res.json()
}

export async function adminOverview(token: string) {
  return apiFetch('/v1/admin/overview', token)
}

export async function adminTelemetrySummary(token: string) {
  return apiFetch('/v1/admin/telemetry/summary', token)
}

export async function adminTelemetryRecent(token: string, limit = 50) {
  return apiFetch(`/v1/admin/telemetry/recent?limit=${limit}`, token)
}

export async function adminManagedOverview(token: string) {
  return apiFetch('/v1/admin/managed/overview', token)
}

export async function adminManagedSubscribers(
  token: string,
  params: { search?: string; status?: string } = {},
) {
  const qs = new URLSearchParams()
  if (params.search?.trim()) qs.set('search', params.search.trim())
  if (params.status?.trim()) qs.set('status', params.status.trim())
  const q = qs.toString()
  return apiFetch(`/v1/admin/managed/subscribers${q ? `?${q}` : ''}`, token)
}

export async function adminManagedUsers(
  token: string,
  params: { search?: string; has_keys?: boolean; active_7d?: boolean } = {},
) {
  const qs = new URLSearchParams()
  if (params.search?.trim()) qs.set('search', params.search.trim())
  if (params.has_keys === true) qs.set('has_keys', 'true')
  if (params.has_keys === false) qs.set('has_keys', 'false')
  if (params.active_7d === true) qs.set('active_7d', 'true')
  if (params.active_7d === false) qs.set('active_7d', 'false')
  const q = qs.toString()
  return apiFetch(`/v1/admin/managed/users${q ? `?${q}` : ''}`, token)
}

export async function adminManagedUsage(token: string) {
  return apiFetch('/v1/admin/managed/usage', token)
}

export async function adminDemoRequests(token: string, params: { search?: string; limit?: number } = {}) {
  const qs = new URLSearchParams()
  if (params.search?.trim()) qs.set('search', params.search.trim())
  if (params.limit) qs.set('limit', String(params.limit))
  const q = qs.toString()
  return apiFetch(`/v1/admin/demo-requests${q ? `?${q}` : ''}`, token)
}

export async function getApiKeys(token: string) {
  return apiFetch('/v1/auth/api-keys', token)
}

export async function createApiKey(token: string, name: string) {
  return apiFetch('/v1/auth/api-keys', token, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function revokeApiKey(token: string, keyId: string) {
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

export function postAuthRedirect(_data: {
  requires_plan_selection?: boolean
  requires_checkout?: boolean
  has_access?: boolean
  plan?: string | null
}): string {
  return '/dashboard'
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
