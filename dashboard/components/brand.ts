/** Brand colors + logo path */
export const LOGO_SRC = '/zizka-logo.png'
export const BRAND = '#f97316'
export const BRAND_DARK = '#ea580c'
export const BRAND_LIGHT = '#fdba74'
export const BRAND_PALE = '#fed7aa'
export const BRAND_MUTED = '#9a3412'

export const brandLogoStyle = {
  width: 28,
  height: 28,
  borderRadius: 7,
  background: BRAND,
  display: 'flex' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
}

export const enterpriseNavLinkStyle = (active: boolean) => ({
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: 0.25,
  color: active ? '#fff' : '#9a3412',
  textDecoration: 'none',
  padding: '7px 14px',
  borderRadius: 8,
  border: `1px solid ${active ? BRAND : BRAND_PALE}`,
  background: active
    ? `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%)`
    : `linear-gradient(135deg, #fff 0%, ${BRAND_PALE}40 100%)`,
  boxShadow: active ? '0 2px 10px rgba(249,115,22,0.3)' : '0 1px 4px rgba(249,115,22,0.08)',
} as const)

export const brandCtaStyle = {
  fontSize: 14,
  fontWeight: 600,
  color: '#fff',
  textDecoration: 'none',
  padding: '8px 18px',
  background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%)`,
  borderRadius: 8,
  boxShadow: '0 2px 12px rgba(249,115,22,0.35)',
}
