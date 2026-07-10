const API = process.env.NEXT_PUBLIC_API_URL ?? ''
const VISITOR_KEY = 'zdb_visitor_id'
const SESSION_KEY = 'zdb_session_id'

export type AudienceSegment = 'solo' | 'managed' | 'enterprise'

export type MarketingEventType =
  | 'page_view'
  | 'segment_select'
  | 'cta_click'
  | 'replay_scene'
  | 'mcp_copy'
  | 'github_click'
  | 'popup_shown'
  | 'popup_dismiss'
  | 'popup_submit'
  | 'demo_submit'
  | 'agent_slider'
  | 'compare_toggle'

function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

export function getVisitorId(): string {
  if (typeof window === 'undefined') return 'ssr'
  let id = localStorage.getItem(VISITOR_KEY)
  if (!id) {
    id = uuid()
    localStorage.setItem(VISITOR_KEY, id)
  }
  return id
}

export function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr'
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = uuid()
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

export function getStoredSegment(): AudienceSegment | null {
  if (typeof window === 'undefined') return null
  const s = localStorage.getItem('zdb_segment')
  if (s === 'solo' || s === 'managed' || s === 'enterprise') return s
  return null
}

export function storeSegment(segment: AudienceSegment) {
  if (typeof window !== 'undefined') localStorage.setItem('zdb_segment', segment)
}

export function trackMarketingEvent(
  eventType: MarketingEventType,
  payload: Record<string, unknown> = {},
  segment?: AudienceSegment | null,
) {
  if (typeof window === 'undefined' || !API) return
  const body = {
    visitor_id: getVisitorId(),
    session_id: getSessionId(),
    event_type: eventType,
    segment: segment ?? getStoredSegment(),
    page_path: window.location.pathname,
    payload,
  }
  fetch(`${API}/v1/marketing-events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {})
}
