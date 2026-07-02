import { AuthRequestError } from '@/lib/api'

export function isNoAccountError(err: unknown): boolean {
  return err instanceof AuthRequestError && err.status === 404
}

export function isAlreadyRegisteredError(err: unknown): boolean {
  return err instanceof AuthRequestError && err.status === 409
}

export function isGdprConsentError(err: unknown): boolean {
  if (err instanceof AuthRequestError && err.status === 401) {
    return err.message.toLowerCase().includes('gdpr consent')
  }
  if (err instanceof Error) {
    return err.message.toLowerCase().includes('gdpr consent')
  }
  return false
}

export function authErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AuthRequestError || err instanceof Error) {
    return err.message
  }
  return fallback
}
