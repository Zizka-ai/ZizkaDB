'use client'

import { Tabs, type TabItem } from '@/components/ui/Tabs'

/**
 * Second-level tab strip inside the Reports section: Overview ↔ Token Usage.
 * Shared by both `reports/page.tsx` and `reports/token-usage/page.tsx` so the
 * two routes don't duplicate this JSX. The selected agent (`?agent=`) travels
 * across the switch since it's just a query param on the URL.
 */
export function ReportsSubTabs({
  active,
  agentQuery,
}: {
  active: 'overview' | 'token-usage'
  /** Current `?agent=...` query string (including the leading '?agent=' or ''), preserved across the tab switch. */
  agentQuery: string
}) {
  const items: TabItem[] = [
    { href: `/dashboard/reports${agentQuery}`, label: 'Overview', active: active === 'overview' },
    {
      href: `/dashboard/reports/token-usage${agentQuery}`,
      label: 'Token Usage',
      active: active === 'token-usage',
    },
  ]
  return (
    <div className="mb-5">
      <Tabs items={items} ariaLabel="Reports sections" />
    </div>
  )
}
