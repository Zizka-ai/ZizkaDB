const API = process.env.NEXT_PUBLIC_API_URL ?? ''

export interface DemoRequestPayload {
  first_name: string
  last_name: string
  email: string
  company_name: string
  website: string
}

export async function submitDemoRequest(payload: DemoRequestPayload) {
  const res = await fetch(`${API}/v1/demo-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, botcheck: '' }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    const detail = err.detail
    throw new Error(typeof detail === 'string' ? detail : 'Request failed')
  }
  return res.json() as Promise<{ id: string; created_at: string }>
}
