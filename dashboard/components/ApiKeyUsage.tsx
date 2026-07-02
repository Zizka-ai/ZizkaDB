'use client'

import type { ApiKeyQuota } from '@/hooks/useApiKeyQuota'

/**
 * Account-wide API key usage indicator. Renders nothing when the plan is
 * unlimited (self-host, enforcement off, or an uncapped plan) so it adds zero
 * friction for those users. The label is explicitly account-wide because the
 * count is tenant-total even on a single agent's page.
 */
export function ApiKeyUsage({
  quota,
  className,
}: {
  quota: ApiKeyQuota
  className?: string
}) {
  if (quota.loading || quota.unlimited || quota.limit === null) return null

  const { used, limit, at_limit } = quota
  const pct = Math.min(100, Math.round((used / limit) * 100))
  const accent = at_limit ? '#f87171' : '#22c55e'

  return (
    <div className={className} aria-live="polite">
      <div className="flex items-center justify-between text-xs mb-1">
        <span style={{ color: '#e5e5e5' }}>Account API keys</span>
        <span style={{ color: at_limit ? '#f87171' : '#e5e5e5' }}>
          {used} / {limit} used
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: '#1a1a1a' }}
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit}
      >
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: accent }} />
      </div>
      {at_limit && (
        <p className="text-xs mt-1.5" style={{ color: '#f87171' }}>
          Delete an API key or upgrade your plan to create more.
        </p>
      )}
    </div>
  )
}
