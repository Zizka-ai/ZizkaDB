import { redirect } from 'next/navigation'

/**
 * Dashboard entry point.
 *
 * The agent list now lives in Activity (single-agent) and Agent Fleets
 * (multi-agent), so `/dashboard` forwards to the default tab.
 */
export default function DashboardIndexPage() {
  redirect('/dashboard/activity')
}
