import { BRAND, BRAND_DARK, BRAND_LIGHT, BRAND_PALE } from '@/components/brand'

/** Marketing palette: orange brand + blue/teal/violet accents */
export const M = {
  brand: BRAND,
  brandDark: BRAND_DARK,
  brandLight: BRAND_LIGHT,
  brandPale: BRAND_PALE,
  blue: '#2563eb',
  blueLight: '#3b82f6',
  bluePale: '#dbeafe',
  blueDark: '#1d4ed8',
  teal: '#0d9488',
  tealPale: '#ccfbf1',
  violet: '#7c3aed',
  violetPale: '#ede9fe',
  ink: '#000000',
  inkSoft: '#000000',
  muted: '#000000',
  faint: '#000000',
  line: '#e2e8f0',
  wash: '#f8fafc',
  heroBg: 'linear-gradient(145deg, #0c1222 0%, #111827 42%, #1e1b4b 100%)',
  heroGlowOrange: 'radial-gradient(ellipse 80% 60% at 20% 20%, rgba(249,115,22,0.22) 0%, transparent 55%)',
  heroGlowBlue: 'radial-gradient(ellipse 70% 50% at 85% 30%, rgba(59,130,246,0.2) 0%, transparent 55%)',
  heroBorder: 'rgba(255,255,255,0.08)',
  previewBg: '#0b1120',
  previewBorder: '#1e293b',
  previewSurface: '#111827',
  success: '#16a34a',
  warn: '#eab308',
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
  color: '#000',
  textAlign: 'center' as const,
  margin: '0 0 8px',
  textTransform: 'uppercase' as const,
}

export const card = {
  background: '#fff',
  borderRadius: 16,
  border: `1px solid ${M.line}`,
  boxShadow: '0 4px 24px rgba(15,23,42,0.05)',
} as const

export const lead = {
  fontSize: 17,
  color: '#000',
  lineHeight: 1.65,
  textAlign: 'center' as const,
  maxWidth: 580,
  margin: '0 auto 40px',
}

export const primaryBtn = {
  display: 'inline-flex' as const,
  alignItems: 'center' as const,
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
  boxShadow: '0 4px 24px rgba(249,115,22,0.4)',
}

export const blueBtn = {
  display: 'inline-flex' as const,
  alignItems: 'center' as const,
  gap: 8,
  padding: '14px 24px',
  background: `linear-gradient(135deg, ${M.blueLight} 0%, ${M.blueDark} 100%)`,
  color: '#fff',
  borderRadius: 12,
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: 15,
  border: 'none',
  boxShadow: '0 4px 20px rgba(37,99,235,0.35)',
}

export const violetBtn = {
  display: 'inline-flex' as const,
  alignItems: 'center' as const,
  gap: 8,
  padding: '14px 24px',
  background: `linear-gradient(135deg, ${M.violet} 0%, #6d28d9 100%)`,
  color: '#fff',
  borderRadius: 12,
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: 15,
  border: 'none',
  boxShadow: '0 4px 20px rgba(124,58,237,0.35)',
}

export const ghostBtn = {
  display: 'inline-flex' as const,
  alignItems: 'center' as const,
  gap: 8,
  padding: '14px 24px',
  background: 'rgba(255,255,255,0.1)',
  color: '#fff',
  borderRadius: 12,
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: 15,
  border: '1px solid rgba(255,255,255,0.18)',
}

export const outlineBtn = {
  display: 'inline-flex' as const,
  alignItems: 'center' as const,
  gap: 8,
  padding: '12px 20px',
  background: '#fff',
  color: M.ink,
  borderRadius: 10,
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: 14,
  border: `1px solid ${M.line}`,
}

export const pricingCardShell = {
  background: '#fff',
  borderRadius: 16,
  padding: '28px 24px',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
} as const

export function pricingCtaStyle(filled: boolean) {
  return {
    padding: '11px 16px',
    borderRadius: 10,
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: 14,
    background: filled ? BRAND : '#fff',
    color: filled ? '#fff' : M.ink,
    border: filled ? 'none' : `1px solid ${M.line}`,
    transition: 'opacity 0.15s ease, box-shadow 0.15s ease',
    boxShadow: filled ? '0 4px 14px rgba(249,115,22,0.25)' : 'none',
  } as const
}
