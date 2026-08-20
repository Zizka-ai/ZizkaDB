import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { API_FETCH_TIMEOUT_MS } from './api'

describe('apiFetch behavior', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('exports a 30 second timeout constant', () => {
    expect(API_FETCH_TIMEOUT_MS).toBe(30_000)
  })

  it('throws on abort timeout', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const err = new Error('Aborted')
            err.name = 'AbortError'
            reject(err)
          })
        })
      }),
    )

    const { getAgents } = await import('./api')
    const pending = getAgents('tok')
    await vi.advanceTimersByTimeAsync(API_FETCH_TIMEOUT_MS + 1)
    await expect(pending).rejects.toThrow(/timed out/i)
  })

  it('clears auth and redirects on 401', async () => {
    vi.stubGlobal('location', { href: '' } as Location)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Invalid token' }),
      })),
    )

    localStorage.clear()
    localStorage.setItem('zizkadb_token', 'old')

    const { getAgents } = await import('./api')
    await expect(getAgents('old')).rejects.toThrow(/session expired/i)
    expect(localStorage.getItem('zizkadb_token')).toBeNull()
    expect(window.location.href).toBe('/login')
  })
})

describe('getToken cookie fallback', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
    document.cookie = ''
  })

  it('reads token from cookie when localStorage is empty', async () => {
    document.cookie = 'zizkadb_token=cookie-token'
    const { getToken } = await import('./auth')
    expect(getToken()).toBe('cookie-token')
  })
})
