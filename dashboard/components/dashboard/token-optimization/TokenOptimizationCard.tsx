'use client'

import Link from 'next/link'
import {
  Coins,
  Gauge,
  Layers,
  RotateCcw,
  TrendingUp,
  ArrowRight,
  ChevronRight,
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

// Human-readable labels for the known state keys detectors emit today. The
// wire shape is an untyped Record so a future detector can add new keys
// without a card rendering crash — an unrecognized key still renders, just
// with its raw name title-cased as a fallback rather than a cryptic
// snake_case string.
const STATE_KEY_LABELS: Record<string, string> = {
  model: 'Model',
  calls: 'Calls',
  avg_tokens_per_call: 'Avg tokens/call',
  avg_input_tokens: 'Avg input tokens',
  cost_usd: 'Cost',
  cost_share_pct: 'Share of spend',
  requests: 'Requests',
  event_type: 'Event',
  repeat_count: 'Repeats',
  bucket: 'Period',
  zscore: 'Std. deviations above typical',
  typical_cost_usd: 'Typical cost',
  cached_tokens: 'Caching',
  projected_monthly_cost_usd: 'Projected monthly cost',
}

function friendlyStateLabel(key: string): string {
  return STATE_KEY_LABELS[key] ?? key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

function friendlyStateValue(key: string, value: unknown): string {
  if (key.endsWith('_usd') || key === 'cost') return `$${Number(value).toFixed(2)}`
  if (key.endsWith('_pct') || key === 'share') return `${Number(value).toFixed(0)}%`
  if (typeof value === 'number') return value.toLocaleString()
  return String(value)
}

/** Renders only populated `current_state`/`recommended_state` keys as
 * friendly label/value lines (see STATE_KEY_LABELS above). */
function StateLines({ state }: { state: Record<string, unknown> }) {
  const entries = Object.entries(state).filter(([, v]) => v !== null && v !== undefined && v !== '')
  if (entries.length === 0) return null
  return (
    <div className="space-y-1">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-2 text-xs">
          <span style={{ color: colors.textFaint }}>{friendlyStateLabel(k)}</span>
          <span className="font-mono" style={{ color: colors.text }}>
            {friendlyStateValue(k, v)}
          </span>
        </div>
      ))}
    </div>
  )
}

const AFFECTED_LABELS: Record<string, string> = { agent: 'Agent', workflow: 'Workflow', model: 'Model', user: 'User' }

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
          className="text-xs px-2 py-0.5"
          style={{ background: colors.surfaceAlt, color: colors.textMuted, borderRadius: radii.sm }}
        >
          {AFFECTED_LABELS[k] ?? k}: <span className="font-mono">{v}</span>
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

        <details className="group">
          <summary
            className="flex items-center gap-1 text-xs font-medium cursor-pointer select-none"
            style={{ color: colors.info }}
          >
            <ChevronRight size={12} className="transition-transform group-open:rotate-90" />
            Why this recommendation?
          </summary>
          <p className="text-sm mt-2 pl-4" style={{ color: colors.textMuted }}>
            {suggestion.why}
          </p>
        </details>

        {suggestion.related_report_link && (
          <div className="pt-1" style={{ borderTop: `1px solid ${colors.border}` }}>
            <Link
              href={suggestion.related_report_link}
              className="inline-flex items-center gap-1.5 text-xs font-medium mt-3"
              style={{ color: colors.info }}
            >
              View the underlying data in Token Usage
              <ArrowRight size={12} />
            </Link>
          </div>
        )}
      </div>
    </article>
  )
}
