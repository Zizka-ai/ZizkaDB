import { BRAND, BRAND_DARK, BRAND_LIGHT, BRAND_PALE } from '@/components/brand'

/** Unified marketing palette — aligned with zizka.ai (dark navy + orange). */
export const M = {
  brand: BRAND,
  brandDark: BRAND_DARK,
  brandLight: BRAND_LIGHT,
  brandPale: BRAND_PALE,

  bg: '#060610',
  bgElevated: '#0b0f1a',
  surface: '#111827',
  surfaceHover: '#1a2234',
  ink: '#ffffff',
  inkSoft: '#ffffff',
  muted: '#ffffff',
  faint: '#ffffff',
  line: 'rgba(255,255,255,0.1)',
  lineStrong: 'rgba(255,255,255,0.16)',

  success: '#22c55e',
  danger: '#f87171',
  warn: '#fbbf24',

  heroBg: 'linear-gradient(145deg, #060610 0%, #0b0f1a 42%, #111827 100%)',
  heroGlowOrange: 'radial-gradient(ellipse 80% 60% at 20% 20%, rgba(249,115,22,0.18) 0%, transparent 55%)',
  heroGlowBlue: 'radial-gradient(ellipse 70% 50% at 85% 30%, rgba(249,115,22,0.08) 0%, transparent 55%)',
  heroBorder: 'rgba(255,255,255,0.08)',
  previewBg: '#0b0f16',
  previewBorder: 'rgba(255,255,255,0.12)',
  previewSurface: '#161c26',

  /** Legacy aliases — dark sections (compare panels). */
  wash: '#0b0f1a',
  blue: BRAND,
  bluePale: 'rgba(249,115,22,0.12)',
} as const

export const container = (max = 960) => ({ maxWidth: max, margin: '0 auto' } as const)

export const h2 = {
  fontSize: 32,
  fontWeight: 700,
  letterSpacing: -0.5,
  color: M.ink,
  margin: '0 0 12px',
  textAlign: 'center' as const,
  lineHeight: 1.25,
}

export const sectionTitle = {
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: 0.5,
  color: M.brandLight,
  textAlign: 'center' as const,
  margin: '0 0 8px',
  textTransform: 'uppercase' as const,
}

export const card = {
  background: M.surface,
  borderRadius: 16,
  border: `1px solid ${M.line}`,
  boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
} as const

export const lead = {
  fontSize: 17,
  color: M.muted,
  lineHeight: 1.65,
  textAlign: 'center' as const,
  maxWidth: 580,
  margin: '0 auto 40px',
}

export const primaryBtn = {
  display: 'inline-flex' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 8,
  padding: '14px 28px',
  background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%)`,
  color: '#fff',
  borderRadius: 12,
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: 15,
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 4px 24px rgba(249,115,22,0.38)',
}

export const secondaryBtn = {
  display: 'inline-flex' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 8,
  padding: '14px 24px',
  background: 'rgba(255,255,255,0.06)',
  color: M.ink,
  borderRadius: 12,
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: 15,
  border: `1px solid ${M.lineStrong}`,
}

export const ghostBtn = {
  display: 'inline-flex' as const,
  alignItems: 'center' as const,
  gap: 8,
  padding: '14px 24px',
  background: 'rgba(255,255,255,0.06)',
  color: M.inkSoft,
  borderRadius: 12,
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: 15,
  border: `1px solid ${M.lineStrong}`,
}

export const outlineBtn = {
  display: 'inline-flex' as const,
  alignItems: 'center' as const,
  gap: 8,
  padding: '12px 20px',
  background: 'transparent',
  color: M.inkSoft,
  borderRadius: 10,
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: 14,
  border: `1px solid ${M.lineStrong}`,
}

export const pricingCardShell = {
  background: M.surface,
  borderRadius: 16,
  padding: '28px 24px',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  border: `1px solid ${M.line}`,
} as const

export function pricingCtaStyle(filled: boolean) {
  return {
    padding: '11px 16px',
    borderRadius: 10,
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: 14,
    background: filled ? BRAND : 'transparent',
    color: filled ? '#fff' : M.inkSoft,
    border: filled ? 'none' : `1px solid ${M.lineStrong}`,
    transition: 'opacity 0.15s ease, box-shadow 0.15s ease',
    boxShadow: filled ? '0 4px 14px rgba(249,115,22,0.25)' : 'none',
  } as const
}

/** Shared panel for signup/login on dark marketing shell. */
export const authPanel = {
  background: M.surface,
  borderRadius: 16,
  padding: '28px 24px',
  border: `1px solid ${M.line}`,
  boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
} as const
