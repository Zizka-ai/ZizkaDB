'use client'

/**
 * Shared dashboard UI primitives.
 *
 * Before this existed every screen hand-rolled its own empty/error/skeleton
 * markup (Skeleton was even defined twice), which is why the dashboard looked
 * inconsistent. Everything here is presentational and prop-driven — no data
 * fetching, no business logic.
 */

import { type ReactNode } from 'react'
import { AlertCircle, Loader2, Copy, Check } from 'lucide-react'
import { colors, radii, STATUS_COLORS, STATUS_LABELS, type StatusTone } from '@/lib/design-tokens'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'

/* ── Layout ─────────────────────────────────────────────────────────────── */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold" style={{ color: colors.textStrong }}>
          {title}
        </h1>
        {description && (
          <p className="text-sm mt-0.5" style={{ color: colors.textMuted }}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

export function Card({
  children,
  className = '',
  padded = true,
}: {
  children: ReactNode
  className?: string
  padded?: boolean
}) {
  return (
    <div
      className={`${padded ? 'p-4' : ''} ${className}`}
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radii.lg,
      }}
    >
      {children}
    </div>
  )
}

/* ── Controls ───────────────────────────────────────────────────────────── */

const BUTTON_TONES = {
  default: { bg: colors.surface, fg: colors.text, border: colors.border },
  primary: { bg: colors.successBg, fg: colors.success, border: `${colors.success}40` },
  danger: { bg: colors.dangerBg, fg: colors.danger, border: `${colors.danger}40` },
} as const

export function Button({
  children,
  onClick,
  type = 'button',
  tone = 'default',
  size = 'md',
  disabled = false,
  title,
}: {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  tone?: keyof typeof BUTTON_TONES
  size?: 'sm' | 'md'
  disabled?: boolean
  title?: string
}) {
  const { bg, fg, border } = BUTTON_TONES[tone]
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`btn-hover inline-flex items-center gap-1.5 font-medium disabled:opacity-40 ${
        size === 'sm' ? 'text-xs px-2.5 py-1.5' : 'text-sm px-4 py-2'
      }`}
      style={{ background: bg, color: fg, border: `1px solid ${border}`, borderRadius: radii.md }}
    >
      {children}
    </button>
  )
}

/* ── States (loading / empty / error) ───────────────────────────────────── */

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{
            height: 56,
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radii.lg,
          }}
        />
      ))}
    </div>
  )
}

export function LoadingLine({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      className="flex items-center gap-2 text-sm py-8"
      style={{ color: colors.textMuted }}
      aria-live="polite"
    >
      <Loader2 size={14} className="animate-spin" />
      {label}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div
      className="text-center py-14 px-6"
      style={{
        background: colors.surfaceAlt,
        border: `1px dashed ${colors.borderStrong}`,
        borderRadius: radii.lg,
      }}
    >
      {icon && <div className="flex justify-center mb-3">{icon}</div>}
      <p className="text-sm font-medium" style={{ color: colors.text }}>
        {title}
      </p>
      {description && (
        <p className="text-sm mt-1.5 max-w-md mx-auto" style={{ color: colors.textMuted }}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({
  message,
  action,
}: {
  message: string
  action?: ReactNode
}) {
  return (
    <div
      className="flex items-start gap-2.5 px-4 py-3 text-sm"
      role="alert"
      style={{
        background: colors.dangerBg,
        border: `1px solid #3a1f1f`,
        borderRadius: radii.lg,
        color: colors.danger,
      }}
    >
      <AlertCircle size={15} className="mt-0.5 shrink-0" />
      <div className="min-w-0">
        <span>{message}</span>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  )
}

/* ── Data display ───────────────────────────────────────────────────────── */

export function StatusBadge({ tone, label }: { tone: StatusTone; label?: string }) {
  const { fg, bg } = STATUS_COLORS[tone]
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 shrink-0"
      style={{ background: bg, color: fg, borderRadius: radii.sm }}
    >
      {/* Dot + text: never colour alone (accessibility). */}
      <span
        aria-hidden="true"
        style={{ width: 6, height: 6, borderRadius: radii.full, background: fg }}
      />
      {label ?? STATUS_LABELS[tone]}
    </span>
  )
}

export function MetaRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="font-mono shrink-0" style={{ color: colors.textFaint, minWidth: 88 }}>
        {label}
      </span>
      <span className="font-mono break-all" style={{ color: colors.text }}>
        {value}
      </span>
    </div>
  )
}

export function JsonBlock({ value, maxHeight = 320 }: { value: unknown; maxHeight?: number }) {
  return (
    <pre
      className="text-xs font-mono p-3 overflow-auto"
      style={{
        background: colors.bg,
        color: colors.text,
        borderRadius: radii.md,
        maxHeight,
      }}
    >
      {JSON.stringify(value ?? {}, null, 2)}
    </pre>
  )
}

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const { copied, copy } = useCopyToClipboard()
  return (
    <button
      type="button"
      onClick={() => copy(value)}
      className="btn-hover inline-flex items-center gap-1.5 text-xs px-2.5 py-1"
      style={{
        background: colors.surfaceHover,
        border: `1px solid ${colors.borderStrong}`,
        borderRadius: radii.md,
        color: copied ? colors.success : colors.text,
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : label}
    </button>
  )
}
