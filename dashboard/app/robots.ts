import type { MetadataRoute } from 'next'

// OSS dashboard only — no operator /admin routes in this repo (see docs/REPO_SPLIT.md).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/dashboard/'],
    },
  }
}
