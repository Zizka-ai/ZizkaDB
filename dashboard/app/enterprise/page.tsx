import type { Metadata } from 'next'
import { EnterprisePageClient } from '@/components/marketing/enterprise/EnterprisePageClient'

export const metadata: Metadata = {
  title: 'Enterprise — VPC deployment for agent fleets',
  description:
    'Licensed ZizkaDB in your VPC. Fleet observability, behavioral drift, audit exports, and Week-1 install — without rebuilding your agent platform.',
  openGraph: {
    title: 'ZizkaDB Enterprise — VPC deployment for agent fleets',
    description:
      'Licensed, single-tenant ZizkaDB in your cloud. Fleet dashboard, behavioral drift, audit export, and supported Week-1 install.',
    type: 'website',
  },
}

export default function EnterprisePage() {
  return <EnterprisePageClient />
}
