'use client'

import { Suspense, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Settings, LogOut } from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'
import { ConnectionStatus } from '@/components/ConnectionStatus'
import { TenantPlanBanner } from '@/components/TenantPlanBanner'
import { Tabs, type TabItem } from '@/components/ui/Tabs'
import { AgentSelector } from '@/components/dashboard/AgentSelector'
import { useEdition } from '@/hooks/useEdition'
import { useAgents } from '@/hooks/useAgents'
import { useSelectedAgent } from '@/hooks/useSelectedAgent'
import { clearToken } from '@/lib/auth'
import { colors } from '@/lib/design-tokens'

/** Tabs available in every edition, in display order. */
const BASE_TABS = [
  { href: '/dashboard/activity', label: 'Activity' },
  { href: '/dashboard/behavior', label: 'Agent Behavior' },
  { href: '/dashboard/reports', label: 'Reports' },
  { href: '/dashboard/suggestions', label: 'Suggestions' },
]

/** Managed-only: fleet-level view across agents. */
const FLEET_TAB = { href: '/dashboard/fleet', label: 'Agent Fleets' }

export function DashboardTabsShell({ children }: { children: ReactNode }) {
  return (
    // useSearchParams (via useSelectedAgent) requires a Suspense boundary,
    // otherwise Next bails out of static rendering at build time.
    <Suspense fallback={<ShellFallback>{children}</ShellFallback>}>
      <ShellInner>{children}</ShellInner>
    </Suspense>
  )
}

function ShellFallback({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: colors.bg }}>
      <main className="max-w-6xl mx-auto">{children}</main>
    </div>
  )
}

function ShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const { edition } = useEdition()
  const { agents } = useAgents()
  const { agentId, selectAgent } = useSelectedAgent(agents)

  const tabDefs = edition === 'managed' ? [...BASE_TABS, FLEET_TAB] : BASE_TABS

  // Carry the selected agent across tab navigation so context isn't lost.
  const agentQuery = agentId ? `?agent=${encodeURIComponent(agentId)}` : ''
  const items: TabItem[] = tabDefs.map((t) => ({
    label: t.label,
    // Fleet is not agent-scoped.
    href: t.href === FLEET_TAB.href ? t.href : `${t.href}${agentQuery}`,
    active: pathname === t.href || pathname.startsWith(`${t.href}/`),
  }))

  function signOut() {
    clearToken()
    router.push('/login')
  }

  const settingsActive = pathname.startsWith('/dashboard/settings')

  return (
    <div className="min-h-screen flex flex-col" style={{ background: colors.bg }}>
      <header style={{ background: colors.surfaceAlt, borderBottom: `1px solid ${colors.border}` }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Brand + global actions */}
          <div className="flex items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <BrandLogo variant="mark" showWordmark={false} href="/dashboard" />
              <span className="font-semibold" style={{ color: colors.textStrong }}>
                ZizkaDB
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <AgentSelector agents={agents} selected={agentId} onSelect={selectAgent} />
              <Link
                href="/dashboard/settings"
                aria-label="Settings"
                title="Settings"
                className="p-2 rounded-lg transition"
                style={{ color: settingsActive ? colors.textStrong : colors.textMuted }}
              >
                <Settings size={16} />
              </Link>
              <button
                onClick={signOut}
                aria-label="Sign out"
                title="Sign out"
                className="p-2 rounded-lg transition"
                style={{ color: colors.textMuted }}
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>

          <Tabs items={items} />
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6">
        <TenantPlanBanner />
        <ConnectionStatus />
        {children}
      </main>
    </div>
  )
}
