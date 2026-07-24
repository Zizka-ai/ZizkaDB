import type { Metadata } from 'next'
import { DashboardTabsShell } from '@/components/dashboard/DashboardTabsShell'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardTabsShell>{children}</DashboardTabsShell>
}
