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
  bg: '#0a0a0a', // app background
  surface: '#111111', // cards, panels
  surfaceAlt: '#0d0d0d', // inputs, insets
  surfaceHover: '#1a1a1a',
  border: '#1f1f1f',
  borderStrong: '#262626',

  text: '#e5e5e5', // primary (off-white, not pure white)
  textStrong: '#ffffff',
  textMuted: '#a3a3a3', // secondary — ~7.4:1 on bg
  // tertiary (labels, timestamps, metadata). #808080 clears WCAG AA (~4.6:1
  // on the near-black bg); the previous #666 was ~3.4:1 and hard to read.
  textFaint: '#808080',

  success: '#22c55e',
  successBg: '#14241a',
  info: '#3b82f6',
  infoBg: '#111c2e',
  warning: '#f59e0b',
  warningBg: '#251c0e',
  danger: '#f87171',
  dangerBg: '#2a1414',
} as const

export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  full: 9999,
} as const

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
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
