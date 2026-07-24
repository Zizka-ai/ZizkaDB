'use client'

import {
  Code2,
  Coins,
  Gauge,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { CopyButton } from '@/components/ui'
import { colors, radii } from '@/lib/design-tokens'
import { CATEGORY_META } from '@/lib/suggestions'
import type { Suggestion, SuggestionEvidence } from '@/lib/api'
import { SeverityBadge } from './SeverityBadge'
import { ConfidenceMeter } from './ConfidenceMeter'

const ICONS: Record<string, LucideIcon> = {
  Sparkles,
  Coins,
  ShieldAlert,
  Gauge,
  ShieldCheck,
  Code2,
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="text-xs font-medium uppercase tracking-wide mb-1"
        style={{ color: colors.textFaint }}
      >
        {label}
      </div>
      <div className="text-sm" style={{ color: colors.text }}>
        {children}
      </div>
    </div>
  )
}

/**
 * One suggestion. Header: category + severity + confidence. Body: title,
 * Evidence (the real facts this is grounded in), Recommendation, Expected
 * impact, and an optional copyable code fix.
 */
export function SuggestionCard({
  suggestion,
  evidenceById,
}: {
  suggestion: Suggestion
  evidenceById: Record<string, SuggestionEvidence>
}) {
  const cat = CATEGORY_META[suggestion.category]
  const Icon = ICONS[cat.icon] ?? Sparkles
  const cited = suggestion.evidence.map((id) => evidenceById[id]).filter(Boolean)

  return (
    <article
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radii.lg,
      }}
    >
      <div
        className="flex items-center gap-2 flex-wrap px-4 py-3"
        style={{ borderBottom: `1px solid ${colors.border}` }}
      >
        <Icon size={15} style={{ color: colors.info }} className="shrink-0" />
        <span className="text-xs font-medium" style={{ color: colors.textMuted }}>
          {cat.label}
        </span>
        <SeverityBadge severity={suggestion.severity} />
        <div className="ml-auto">
          <ConfidenceMeter confidence={suggestion.confidence} />
        </div>
      </div>

      <div className="p-4 space-y-4">
        <h3 className="text-sm font-semibold" style={{ color: colors.textStrong }}>
          {suggestion.title}
        </h3>

        {cited.length > 0 && (
          <Section label="Evidence">
            <ul className="space-y-1">
              {cited.map((e) => (
                <li key={e.id} className="flex gap-2" style={{ color: colors.textMuted }}>
                  <span aria-hidden style={{ color: colors.textFaint }}>
                    •
                  </span>
                  <span>{e.summary}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section label="Recommendation">{suggestion.recommendation}</Section>

        {suggestion.expected_impact && (
          <Section label="Expected impact">
            <span style={{ color: colors.textMuted }}>{suggestion.expected_impact}</span>
          </Section>
        )}

        {suggestion.code_fix && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div
                className="text-xs font-medium uppercase tracking-wide"
                style={{ color: colors.textFaint }}
              >
                Code fix
                <span className="ml-2 font-mono lowercase" style={{ color: colors.textMuted }}>
                  {suggestion.code_fix.language}
                </span>
              </div>
              <CopyButton value={suggestion.code_fix.code} label="Copy" />
            </div>
            <pre
              className="text-xs font-mono p-3 overflow-auto"
              style={{ background: colors.bg, color: colors.text, borderRadius: radii.md, maxHeight: 320 }}
            >
              {suggestion.code_fix.code}
            </pre>
          </div>
        )}
      </div>
    </article>
  )
}
