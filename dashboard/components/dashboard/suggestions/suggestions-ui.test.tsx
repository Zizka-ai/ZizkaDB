import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Suggestion, SuggestionEvidence } from '@/lib/api'
import { SeverityBadge } from './SeverityBadge'
import { ConfidenceMeter } from './ConfidenceMeter'
import { SuggestionCard } from './SuggestionCard'

const evidence: SuggestionEvidence[] = [
  {
    id: 'recurring_errors',
    category: 'error_prevention',
    label: 'Recurring errors',
    summary: 'ToolError occurred 9 times (3.9% of events)',
    metrics: { count: 9 },
    samples: [],
    strength: 80,
  },
]

const base: Suggestion = {
  title: 'Add retry handling for ToolError',
  category: 'error_prevention',
  severity: 'high',
  confidence: 80,
  evidence: ['recurring_errors'],
  recommendation: 'Wrap the tool call in a retry with backoff.',
  expected_impact: 'Reduces the 3.9% error rate.',
}

const byId = Object.fromEntries(evidence.map((e) => [e.id, e]))

describe('SeverityBadge', () => {
  it('renders the severity label as text (not color alone)', () => {
    render(<SeverityBadge severity="critical" />)
    expect(screen.getByText('Critical')).toBeInTheDocument()
  })
})

describe('ConfidenceMeter', () => {
  it('shows a rounded percentage with an accessible label', () => {
    render(<ConfidenceMeter confidence={72.4} />)
    expect(screen.getByText('72%')).toBeInTheDocument()
    expect(screen.getByLabelText('72% confidence')).toBeInTheDocument()
  })
})

describe('SuggestionCard', () => {
  it('renders title, category, severity, evidence, recommendation and impact', () => {
    render(<SuggestionCard suggestion={base} evidenceById={byId} />)
    expect(screen.getByText(base.title)).toBeInTheDocument()
    expect(screen.getByText('Error prevention')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText(evidence[0].summary)).toBeInTheDocument()
    expect(screen.getByText(base.recommendation)).toBeInTheDocument()
    expect(screen.getByText(base.expected_impact)).toBeInTheDocument()
  })

  it('shows a copyable code fix only when present', () => {
    const { rerender } = render(<SuggestionCard suggestion={base} evidenceById={byId} />)
    expect(screen.queryByText('Code fix')).not.toBeInTheDocument()

    rerender(
      <SuggestionCard
        suggestion={{ ...base, code_fix: { language: 'python', code: 'retry()' } }}
        evidenceById={byId}
      />,
    )
    expect(screen.getByText('Code fix')).toBeInTheDocument()
    expect(screen.getByText('retry()')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
  })

  it('ignores evidence refs that are not in the bundle', () => {
    render(
      <SuggestionCard suggestion={{ ...base, evidence: ['ghost'] }} evidenceById={byId} />,
    )
    expect(screen.queryByText(evidence[0].summary)).not.toBeInTheDocument()
  })
})
