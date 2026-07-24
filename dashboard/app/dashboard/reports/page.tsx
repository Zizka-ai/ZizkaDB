'use client'

import { FileText } from 'lucide-react'
import { PageHeader, EmptyState } from '@/components/ui'
import { colors } from '@/lib/design-tokens'

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Reports"
        description="Generated summaries of agent activity, exportable as PDF."
      />
      <EmptyState
        icon={<FileText size={22} style={{ color: colors.textFaint }} />}
        title="Reports are coming soon"
        description="Weekly summaries will be generated automatically, with an option to build custom reports for any time window and export them as PDF."
      />
    </>
  )
}
