'use client'

import { decodeJwt } from 'jose'
import {
  USER_TOKEN_COOKIE,
  ADMIN_TOKEN_COOKIE,
  TOKEN_MAX_AGE_SEC,
} from './session-cookies'

function cookieSuffix(): string {
  const secure =
    typeof window !== 'undefined' && window.location.protocol === 'https:'
      ? '; Secure'
      : ''
  return `; path=/; max-age=${TOKEN_MAX_AGE_SEC}; SameSite=Lax${secure}`
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}${cookieSuffix()}`
}

function eraseCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(USER_TOKEN_COOKIE)
}

export function setToken(token: string) {
  localStorage.setItem(USER_TOKEN_COOKIE, token)
  writeCookie(USER_TOKEN_COOKIE, token)
}

export function clearToken() {
  localStorage.removeItem(USER_TOKEN_COOKIE)
  eraseCookie(USER_TOKEN_COOKIE)
}

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ADMIN_TOKEN_COOKIE)
}

export function setAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_COOKIE, token)
  writeCookie(ADMIN_TOKEN_COOKIE, token)
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_COOKIE)
  eraseCookie(ADMIN_TOKEN_COOKIE)
}

export function getSessionEmail(): string | null {
  const token = getToken()
  if (!token) return null
  try {
    const payload = decodeJwt(token)
    return typeof payload.email === 'string' ? payload.email : null
  } catch {
    return null
  }
}

export function requireAuth(): string {
  const token = getToken()
  if (!token) {
    window.location.href = '/login'
    throw new Error('Not authenticated')
  }
  return token
}
