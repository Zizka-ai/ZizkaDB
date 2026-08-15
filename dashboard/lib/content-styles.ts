import type { CSSProperties } from 'react'

/** Body copy on dark marketing/docs surfaces */
export const textOnDark: CSSProperties = { color: '#ffffff' }

/** Body copy on white/light surfaces */
export const textOnLight: CSSProperties = { color: '#000000' }

/** Inline code chip on dark pages — white background, black text */
export const codeInlineLight: CSSProperties = {
  fontFamily: 'monospace',
  background: '#ffffff',
  color: '#000000',
  padding: '2px 6px',
  borderRadius: 4,
}

/** Inline code on dark background (no chip) */
export const codeMonoDark: CSSProperties = {
  fontFamily: 'monospace',
  color: '#ffffff',
}

/** Inline code on white/light background (no chip) */
export const codeInlineOnLight: CSSProperties = {
  fontFamily: 'monospace',
  fontSize: 12.5,
  background: '#f5f5f5',
  color: '#000000',
  padding: '2px 6px',
  borderRadius: 4,
}
