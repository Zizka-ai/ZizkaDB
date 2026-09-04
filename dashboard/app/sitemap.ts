import type { MetadataRoute } from 'next'

const SITE_URL = process.env.DASHBOARD_URL || 'https://db.zizka.ai'

// Public marketing/docs pages only -- /dashboard and /admin are excluded from
// robots.ts and have no SEO value, and /login + /signup are auth flows, not
// content worth ranking. Keep this list in sync with dashboard/app/*/page.tsx
// as new public pages are added.
const ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
  { path: '', changeFrequency: 'weekly', priority: 1 },
  { path: '/docs', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/eu-ai-act', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/community', changeFrequency: 'daily', priority: 0.7 },
  { path: '/trust', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))
}
