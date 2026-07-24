import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const getApiKeyUsage = vi.fn()
const getToken = vi.fn()

vi.mock('@/lib/api', () => ({ getApiKeyUsage: (...a: unknown[]) => getApiKeyUsage(...a) }))
vi.mock('@/lib/auth', () => ({ getToken: () => getToken() }))

const ORIGINAL_MODE = process.env.NEXT_PUBLIC_DEPLOYMENT_MODE

async function loadHook() {
  vi.resetModules()
  return (await import('./useEdition')).useEdition
}

beforeEach(() => {
  getToken.mockReturnValue('tok')
  getApiKeyUsage.mockReset()
})

afterEach(() => {
  process.env.NEXT_PUBLIC_DEPLOYMENT_MODE = ORIGINAL_MODE
})

describe('useEdition — env signal is authoritative', () => {
  it('self_hosted → oss, without any network call', async () => {
    process.env.NEXT_PUBLIC_DEPLOYMENT_MODE = 'self_hosted'
    const useEdition = await loadHook()

    const { result } = renderHook(() => useEdition())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.edition).toBe('oss')
    expect(getApiKeyUsage).not.toHaveBeenCalled()
  })

  it('managed → managed', async () => {
    process.env.NEXT_PUBLIC_DEPLOYMENT_MODE = 'managed'
    const useEdition = await loadHook()

    const { result } = renderHook(() => useEdition())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.edition).toBe('managed')
  })
})

describe('useEdition — plan fallback when env is unset', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_DEPLOYMENT_MODE
  })

  it.each(['pro', 'team', 'enterprise'])('plan %s → managed', async (plan) => {
    getApiKeyUsage.mockResolvedValue({ plan })
    const useEdition = await loadHook()

    const { result } = renderHook(() => useEdition())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.edition).toBe('managed')
  })

  it('plan self_hosted → oss', async () => {
    getApiKeyUsage.mockResolvedValue({ plan: 'self_hosted' })
    const useEdition = await loadHook()

    const { result } = renderHook(() => useEdition())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.edition).toBe('oss')
  })

  // The important one: limits enforcement is OFF by default, so plan is null.
  it('null plan → fails CLOSED to oss', async () => {
    getApiKeyUsage.mockResolvedValue({ plan: null })
    const useEdition = await loadHook()

    const { result } = renderHook(() => useEdition())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.edition).toBe('oss')
  })

  it('API error → fails CLOSED to oss', async () => {
    getApiKeyUsage.mockRejectedValue(new Error('boom'))
    const useEdition = await loadHook()

    const { result } = renderHook(() => useEdition())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.edition).toBe('oss')
  })

  it('no token → oss without calling the API', async () => {
    getToken.mockReturnValue(null)
    const useEdition = await loadHook()

    const { result } = renderHook(() => useEdition())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.edition).toBe('oss')
    expect(getApiKeyUsage).not.toHaveBeenCalled()
  })
})
