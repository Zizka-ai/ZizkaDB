/**
 * Design tokens for the dashboard.
 *
 * The dashboard styles with inline hex values scattered across files, which is
 * why screens drifted apart visually. Everything new imports from here so the
 * observability look (near-black surfaces, off-white text, colour used only to
 * carry meaning) stays consistent.
 *
 * Colour semantics — deliberate, not decorative:
 *   success  healthy / create actions
 *   info     navigation, active state
 *   warning  needs attention
 *   danger   ACTUAL failures only
 */

export const colors = {
  // Refined dark: a deep-slate base with real elevation between layers, so
  // cards separate from the background and borders are actually visible
  // (the old near-black palette read as "dim" and options were hard to find).
  bg: '#0b0f16', // deep slate app background
  surface: '#161c26', // cards, panels — visibly raised above bg
  surfaceAlt: '#10151d', // inputs, insets
  surfaceHover: '#1f2733',
  border: '#2a3340', // visible dividers/outlines
  borderStrong: '#3a4453',

  text: '#e8edf5', // primary (~13:1 on bg)
  textStrong: '#ffffff',
  textMuted: '#9aa7b8', // secondary (~9:1 on bg)
  textFaint: '#7c8798', // tertiary — labels/timestamps (AA ~5:1 on bg)

  success: '#22c55e', // emerald — positive / healthy / create actions
  successBg: '#10251a',
  // Indigo is the interactive accent: active tab, focus ring, links, chart
  // events series. `info` keeps its name so the 28 files referencing
  // colors.info pick it up without edits.
  info: '#6366f1',
  infoBg: '#1a1e3a',
  warning: '#f59e0b',
  warningBg: '#2a1f0a',
  danger: '#f87171',
  dangerBg: '#2a1416',
} as const

export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  full: 9999,
} as const

/** Agent/health status vocabulary (from the product spec). */
export type StatusTone = 'healthy' | 'attention' | 'idle' | 'drift' | 'error'

export const STATUS_LABELS: Record<StatusTone, string> = {
  healthy: 'Healthy',
  attention: 'Needs attention',
  idle: 'No recent activity',
  drift: 'Agent drift detected',
  error: 'Errors detected',
}

export const STATUS_COLORS: Record<StatusTone, { fg: string; bg: string }> = {
  healthy: { fg: colors.success, bg: colors.successBg },
  attention: { fg: colors.warning, bg: colors.warningBg },
  idle: { fg: colors.textMuted, bg: colors.surfaceHover },
  drift: { fg: colors.warning, bg: colors.warningBg },
  error: { fg: colors.danger, bg: colors.dangerBg },
}

/** An agent is "active" if seen within this window (matches existing AgentCard logic). */
export const ACTIVE_WINDOW_MS = 5 * 60 * 1000
