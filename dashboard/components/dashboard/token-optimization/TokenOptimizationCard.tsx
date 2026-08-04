'use client'

import Link from 'next/link'
import {
  Coins,
  Gauge,
  Layers,
  RotateCcw,
  TrendingUp,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'
import { colors, radii } from '@/lib/design-tokens'
import { TOKEN_OPT_CATEGORY_META, TOKEN_OPT_SEVERITY_META, formatSavings, formatTokenReduction } from '@/lib/token-optimization'
import type { TokenOptimizationSuggestion } from '@/lib/api'
import { SeverityBadge } from '@/components/dashboard/suggestions/SeverityBadge'
import { ConfidenceMeter } from '@/components/dashboard/suggestions/ConfidenceMeter'

const ICONS: Record<string, LucideIcon> = { Coins, Gauge, Layers, RotateCcw, TrendingUp }

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: colors.textFaint }}>
        {label}
      </div>
      <div className="text-sm" style={{ color: colors.text }}>
        {children}
      </div>
    </div>
  )
}

/** Renders only populated `current_state`/`recommended_state` keys as plain
 * key/value lines — the wire shape is an untyped Record so a future detector
 * can add new state keys without a card rendering crash; unrecognized keys
 * fall back to a generic label rather than being silently dropped. */
function StateLines({ state }: { state: Record<string, unknown> }) {
  const entries = Object.entries(state).filter(([, v]) => v !== null && v !== undefined && v !== '')
  if (entries.length === 0) return null
  return (
    <div className="space-y-0.5">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-center gap-1.5 text-xs font-mono" style={{ color: colors.textMuted }}>
          <span style={{ color: colors.textFaint }}>{k.replace(/_/g, ' ')}:</span>
          <span style={{ color: colors.text }}>{String(v)}</span>
        </div>
      ))}
    </div>
  )
}

function AffectedChips({ affected }: { affected: TokenOptimizationSuggestion['affected'] }) {
  const chips = (Object.entries(affected) as Array<[string, string | null | undefined]>).filter(
    ([, v]) => v !== null && v !== undefined,
  )
  if (chips.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map(([k, v]) => (
        <span
          key={k}
          className="text-xs font-mono px-2 py-0.5"
          style={{ background: colors.surfaceAlt, color: colors.textMuted, borderRadius: radii.sm }}
        >
          {k}: {v}
        </span>
      ))}
    </div>
  )
}

/**
 * One Token Optimization suggestion card. Header: category + severity +
 * confidence (mirrors AI Suggestions' SuggestionCard layout for visual
 * consistency, reusing the same SeverityBadge/ConfidenceMeter primitives).
 * Body: title, savings/reduction stats, current -> recommended state,
 * affected entities, an expandable native <details> for the deterministic
 * "why" reasoning, and an optional deep link into the Token Usage report.
 */
export function TokenOptimizationCard({ suggestion }: { suggestion: TokenOptimizationSuggestion }) {
  const cat = TOKEN_OPT_CATEGORY_META[suggestion.category]
  const Icon = ICONS[cat.icon] ?? Coins
  const severityMeta = TOKEN_OPT_SEVERITY_META[suggestion.severity]
  const hasSavings = suggestion.estimated_monthly_savings_usd > 0
  const hasReduction = suggestion.estimated_token_reduction_pct > 0

  return (
    <article style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg }}>
      <div
        className="flex items-center gap-2 flex-wrap px-4 py-3"
        style={{ borderBottom: `1px solid ${colors.border}` }}
      >
        <Icon size={15} style={{ color: colors.info }} className="shrink-0" />
        <span className="text-xs font-medium" style={{ color: colors.textMuted }}>
          {cat.label}
        </span>
        <SeverityBadge severity={suggestion.severity} meta={severityMeta} />
        <div className="ml-auto">
          <ConfidenceMeter confidence={suggestion.confidence_score} />
        </div>
      </div>

      <div className="p-4 space-y-4">
        <h3 className="text-sm font-semibold" style={{ color: colors.textStrong }}>
          {suggestion.title}
        </h3>

        <div className="flex flex-wrap gap-4">
          {hasSavings && (
            <div>
              <div className="text-xs" style={{ color: colors.textFaint }}>
                Estimated savings
              </div>
              <div className="text-lg font-mono font-semibold" style={{ color: colors.success }}>
                {formatSavings(suggestion.estimated_monthly_savings_usd)}
              </div>
            </div>
          )}
          {hasReduction && (
            <div>
              <div className="text-xs" style={{ color: colors.textFaint }}>
                Token reduction
              </div>
              <div className="text-lg font-mono font-semibold" style={{ color: colors.text }}>
                {formatTokenReduction(suggestion.estimated_token_reduction_pct)}
              </div>
            </div>
          )}
        </div>

        <Section label="Summary">{suggestion.summary}</Section>

        {(Object.keys(suggestion.current_state).length > 0 || Object.keys(suggestion.recommended_state).length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.keys(suggestion.current_state).length > 0 && (
              <Section label="Current">
                <StateLines state={suggestion.current_state} />
              </Section>
            )}
            {Object.keys(suggestion.recommended_state).length > 0 && (
              <Section label="Recommended">
                <StateLines state={suggestion.recommended_state} />
              </Section>
            )}
          </div>
        )}

        <Section label="Recommended action">{suggestion.recommended_action}</Section>

        <AffectedChips affected={suggestion.affected} />

        <details>
          <summary
            className="text-xs font-medium uppercase tracking-wide cursor-pointer select-none"
            style={{ color: colors.textFaint }}
          >
            Why?
          </summary>
          <p className="text-sm mt-2" style={{ color: colors.textMuted }}>
            {suggestion.why}
          </p>
        </details>

        {suggestion.related_report_link && (
          <Link
            href={suggestion.related_report_link}
            className="inline-flex items-center gap-1 text-xs font-medium"
            style={{ color: colors.info }}
          >
            View in Token Usage report
            <ArrowRight size={12} />
          </Link>
        )}
      </div>
    </article>
  )
}
