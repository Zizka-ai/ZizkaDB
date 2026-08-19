import { API } from './api'

export interface TelemetryUpdatesPayload {
  email: string
  install_id?: string
  sdk?: string
  source?: string
}

export async function submitTelemetryUpdates(payload: TelemetryUpdatesPayload) {
  const res = await fetch(`${API}/v1/telemetry/updates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, source: payload.source ?? 'dashboard', botcheck: '' }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    const detail = err.detail
    throw new Error(typeof detail === 'string' ? detail : 'Request failed')
  }
  return res.json() as Promise<{ ok: true }>
}

const INSTALL_ID_KEY = 'zizkadb_install_id'

/** Stable anonymous install id for dashboard opt-in (matches SDK telemetry shape). */
export function getOrCreateInstallId(): string {
  if (typeof window === 'undefined') return ''
  try {
    const existing = window.localStorage.getItem(INSTALL_ID_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    window.localStorage.setItem(INSTALL_ID_KEY, id)
    return id
  } catch {
    return ''
  }
}
