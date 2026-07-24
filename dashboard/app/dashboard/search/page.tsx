import { redirect } from 'next/navigation'

/**
 * Legacy standalone search route.
 *
 * Search is now inline in Activity, scoped to the selected agent, so the
 * separate screen is gone. Kept as a redirect for existing links.
 */
export default function LegacySearchPage() {
  redirect('/dashboard/activity')
}
