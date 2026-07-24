'use client'

import { Lightbulb } from 'lucide-react'
import { PageHeader, EmptyState } from '@/components/ui'
import { colors } from '@/lib/design-tokens'

export default function SuggestionsPage() {
  return (
    <>
      <PageHeader
        title="Suggestions"
        description="Recommendations drawn from this agent's recorded behavior."
      />
      <EmptyState
        icon={<Lightbulb size={22} style={{ color: colors.textFaint }} />}
        title="Suggestions are coming soon"
        description="Once enough activity is recorded, this will surface logging gaps, token and cost optimizations, and recurring errors worth preventing."
      />
    </>
  )
}
