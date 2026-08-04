import { colors } from '@/lib/design-tokens'
import type { TokenOptCategory, TokenOptSeverity, TokenOptimizationSuggestion } from '@/lib/api'
import type { SeverityMeta } from '@/lib/suggestions'

/**
 * Presentation metadata for Token Optimization suggestions — the frontend
 * mirror of core/services/token_optimization_models.py's vocabulary. A
 * separate, unrelated vocabulary from lib/suggestions.ts (AI Suggestions):
 * this feature is deterministic, no LLM, so its categories/severities don't
 * overlap with the AI-pipeline's. Pure and tested.
 */

export const TOKEN_OPT_SEVERITY_ORDER: TokenOptSeverity[] = ['critical', 'high', 'medium', 'low']

export const TOKEN_OPT_SEVERITY_META: Record<TokenOptSeverity, SeverityMeta> = {
  critical: { label: 'Critical', fg: colors.danger, bg: colors.dangerBg },
  high: { label: 'High', fg: '#f97316', bg: '#2a1a0a' },
  medium: { label: 'Medium', fg: colors.warning, bg: colors.warningBg },
  low: { label: 'Low', fg: colors.info, bg: colors.infoBg },
}

/** lucide icon name per category — deliberately distinct from
 * lib/suggestions.ts's CATEGORY_META icons so the two suggestion systems
 * are visually distinguishable at a glance. */
export interface TokenOptCategoryMeta {
  label: string
  icon: 'Coins' | 'Gauge' | 'Layers' | 'RotateCcw' | 'TrendingUp'
}

export const TOKEN_OPT_CATEGORY_META: Record<TokenOptCategory, TokenOptCategoryMeta> = {
  high_consumption: { label: 'High consumption', icon: 'Gauge' },
  model_optimization: { label: 'Model optimization', icon: 'Coins' },
  cache_opportunity: { label: 'Cache opportunity', icon: 'Layers' },
  retry_analysis: { label: 'Retry analysis', icon: 'RotateCcw' },
  cost_anomaly: { label: 'Cost anomaly', icon: 'TrendingUp' },
}

export function tokenOptSeverityRank(s: TokenOptSeverity): number {
  const i = TOKEN_OPT_SEVERITY_ORDER.indexOf(s)
  return i === -1 ? TOKEN_OPT_SEVERITY_ORDER.length : i
}

/** Most-severe first, then highest estimated savings — savings is the
 * primary ranking signal here (unlike AI Suggestions, which ranks by
 * confidence), since the point of this tab is "what should I fix first to
 * save the most money." Matches the backend's own dedupe/sort order. */
export function sortTokenOptSuggestions(list: TokenOptimizationSuggestion[]): TokenOptimizationSuggestion[] {
  return [...list].sort(
    (a, b) =>
      tokenOptSeverityRank(a.severity) - tokenOptSeverityRank(b.severity) ||
      b.estimated_monthly_savings_usd - a.estimated_monthly_savings_usd,
  )
}

export function formatSavings(usd: number): string {
  if (usd <= 0) return '$0.00/mo'
  return `$${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo`
}

export function formatTokenReduction(pct: number): string {
  if (pct <= 0) return '—'
  return `${pct.toFixed(0)}%`
}

export function confidenceScoreLabel(score: number): string {
  return `${Math.round(score)}% confidence`
}
