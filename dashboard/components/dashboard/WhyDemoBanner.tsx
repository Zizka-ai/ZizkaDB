'use client'

import { GitBranch, Sparkles } from 'lucide-react'
import { colors, radii } from '@/lib/design-tokens'
import { Button } from '@/components/ui'

export function WhyDemoBanner({
  onRun,
  running,
  error,
}: {
  onRun: () => void
  running: boolean
  error: string | null
}) {
  return (
    <div
      className="mb-4 p-4"
      style={{
        background: colors.successBg,
        border: `1px solid ${colors.success}40`,
        borderRadius: radii.lg,
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="flex gap-3 min-w-0">
          <div
            className="shrink-0 flex items-center justify-center rounded-lg"
            style={{
              width: 36,
              height: 36,
              background: `${colors.success}20`,
              color: colors.success,
            }}
          >
            <GitBranch size={18} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium" style={{ color: colors.textStrong }}>
              Try the Why demo
            </p>
            <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
              Logs a 3-step support chain, then opens the causal{' '}
              <span className="font-medium" style={{ color: colors.text }}>
                Why?
              </span>{' '}
              panel — the same flow as{' '}
              <code className="font-mono text-[11px]" style={{ color: colors.success }}>
                zizkadb demo
              </code>
              .
            </p>
          </div>
        </div>
        <Button size="sm" tone="primary" onClick={onRun} disabled={running}>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles size={14} aria-hidden />
            {running ? 'Running demo…' : 'Run Why demo'}
          </span>
        </Button>
      </div>
      {error && (
        <p className="text-xs mt-2" style={{ color: colors.danger }} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
