import { BRAND, BRAND_DARK } from '@/components/brand'
import { M, authPanel } from './marketing-theme'

export const authPage = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: M.bg,
  fontFamily: 'Inter, system-ui, sans-serif',
} as const

export const authCard = authPanel

export const authTitle = {
  fontSize: 20,
  fontWeight: 700,
  color: M.ink,
  marginBottom: 6,
} as const

export const authSubtitle = {
  fontSize: 14,
  color: M.muted,
  marginBottom: 24,
  lineHeight: 1.6,
} as const

export const authLabel = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: M.muted,
  marginBottom: 6,
} as const

export const authInput = {
  width: '100%',
  boxSizing: 'border-box' as const,
  padding: '10px 14px',
  borderRadius: 9,
  fontSize: 14,
  border: `1px solid ${M.lineStrong}`,
  outline: 'none',
  color: M.ink,
  background: M.bgElevated,
}

export const authSubmitBtn = {
  padding: '11px',
  borderRadius: 9,
  fontSize: 14,
  fontWeight: 600,
  background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%)`,
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
} as const

export const authLink = {
  color: M.brandLight,
  fontWeight: 600,
  textDecoration: 'none',
} as const

export const authMutedLink = {
  color: M.muted,
  textDecoration: 'none',
  fontWeight: 500,
} as const

export const authFootnote = {
  fontSize: 12,
  color: M.faint,
  textAlign: 'center' as const,
  margin: 0,
}
