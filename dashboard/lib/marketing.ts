import { API } from './api'

export interface MarketingSubscriptionPayload {
  email: string
}

export async function submitMarketingSubscription(payload: MarketingSubscriptionPayload) {
  const res = await fetch(`${API}/v1/marketing-subscriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, source: 'popup', botcheck: '' }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    const detail = err.detail
    throw new Error(typeof detail === 'string' ? detail : 'Request failed')
  }
  return res.json() as Promise<{ ok: true }>
}

