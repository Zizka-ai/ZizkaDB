import { colors } from '@/lib/design-tokens'
import type { Suggestion, SuggestionCategory, SuggestionSeverity } from '@/lib/api'

/**
 * Presentation metadata for suggestions — the frontend mirror of the backend
 * severity/category vocabularies (core/services/ai/config.py). Pure and tested.
 */

export const SEVERITY_ORDER: SuggestionSeverity[] = [
  'critical',
  'high',
  'medium',
  'low',
  'informational',
]

export interface SeverityMeta {
  label: string
  fg: string
  bg: string
}

export const SEVERITY_META: Record<SuggestionSeverity, SeverityMeta> = {
  critical: { label: 'Critical', fg: colors.danger, bg: colors.dangerBg },
  high: { label: 'High', fg: '#f97316', bg: '#2a1a0a' },
  medium: { label: 'Medium', fg: colors.warning, bg: colors.warningBg },
  low: { label: 'Low', fg: colors.info, bg: colors.infoBg },
  informational: { label: 'Info', fg: colors.textMuted, bg: colors.surfaceHover },
}

/** lucide icon name per category (resolved by the card). */
export interface CategoryMeta {
  label: string
  icon: 'Sparkles' | 'Coins' | 'ShieldAlert' | 'Gauge' | 'ShieldCheck' | 'Code2'
}

export const CATEGORY_META: Record<SuggestionCategory, CategoryMeta> = {
  general: { label: 'General', icon: 'Sparkles' },
  token_optimization: { label: 'Token optimization', icon: 'Coins' },
  error_prevention: { label: 'Error prevention', icon: 'ShieldAlert' },
  performance: { label: 'Performance', icon: 'Gauge' },
  reliability: { label: 'Reliability', icon: 'ShieldCheck' },
  code: { label: 'Code', icon: 'Code2' },
}

export function severityRank(s: SuggestionSeverity): number {
  const i = SEVERITY_ORDER.indexOf(s)
  return i === -1 ? SEVERITY_ORDER.length : i
}

/** Most-severe first, then highest confidence — matches the backend ordering. */
export function sortSuggestions(list: Suggestion[]): Suggestion[] {
  return [...list].sort(
    (a, b) => severityRank(a.severity) - severityRank(b.severity) || b.confidence - a.confidence,
  )
}

export function confidenceLabel(confidence: number): string {
  return `${Math.round(confidence)}% confidence`
}

/** Confidence bar color — green when well-supported, muted when weak. */
export function confidenceColor(confidence: number): string {
  if (confidence >= 75) return colors.success
  if (confidence >= 50) return colors.info
  return colors.textMuted
}
