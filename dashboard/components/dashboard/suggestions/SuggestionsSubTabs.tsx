'use client'

import { Tabs, type TabItem } from '@/components/ui/Tabs'

/**
 * Second-level tab strip inside Suggestions: AI Suggestions ↔ Token
 * Optimization. Mirrors report/ReportsSubTabs.tsx's structure exactly.
 * Shared by both `suggestions/page.tsx` and
 * `suggestions/token-optimization/page.tsx` so the two routes don't
 * duplicate this JSX. The selected agent (`?agent=`) travels across the
 * switch since it's just a query param on the URL.
 */
export function SuggestionsSubTabs({
  active,
  agentQuery,
}: {
  active: 'ai-suggestions' | 'token-optimization'
  /** Current `?agent=...` query string (including the leading '?agent=' or ''), preserved across the tab switch. */
  agentQuery: string
}) {
  const items: TabItem[] = [
    {
      href: `/dashboard/suggestions${agentQuery}`,
      label: 'AI Suggestions',
      active: active === 'ai-suggestions',
    },
    {
      href: `/dashboard/suggestions/token-optimization${agentQuery}`,
      label: 'Token Optimization',
      active: active === 'token-optimization',
    },
  ]
  return (
    <div className="mb-5">
      <Tabs items={items} ariaLabel="Suggestions sections" />
    </div>
  )
}
