import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReportBucket, ReportRecommendation } from '@/lib/api'
import { KpiCard } from './KpiCard'
import { Recommendations } from './Recommendations'
import { TrendChart } from './TrendChart'

describe('KpiCard', () => {
  it('shows a "New" badge when there is no previous value', () => {
    render(<KpiCard label="Sessions" value="12" current={12} previous={0} goodDirection="up" />)
    expect(screen.getByText('New')).toBeInTheDocument()
  })

  it('renders a delta percentage when there is a previous value', () => {
    render(<KpiCard label="Events" value="150" current={150} previous={100} goodDirection="up" />)
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('renders without a delta when current/previous are omitted', () => {
    render(<KpiCard label="Event types" value="4" />)
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.queryByText('New')).not.toBeInTheDocument()
  })
})

describe('Recommendations', () => {
  const items: ReportRecommendation[] = [
    { severity: 'info', category: 'observability', title: 'Info item', detail: 'x' },
    { severity: 'critical', category: 'reliability', title: 'Critical item', detail: 'y' },
    { severity: 'positive', category: 'health', title: 'Positive item', detail: 'z' },
  ]

  it('renders all items, most severe first', () => {
    render(<Recommendations items={items} />)
    const titles = screen.getAllByText(/item$/).map((n) => n.textContent)
    expect(titles[0]).toBe('Critical item') // critical ranks above info/positive
    expect(titles).toContain('Positive item')
  })
})

describe('TrendChart', () => {
  const bucket = (d: string, events: number, errors = 0): ReportBucket => ({
    bucket: d,
    events,
    errors,
    sessions: 0,
  })

  it('renders the chart frame with a flatline (not bare text) when there is no activity', () => {
    const buckets = [bucket('2026-07-01T00:00:00', 0), bucket('2026-07-02T00:00:00', 0)]
    const { container } = render(<TrendChart buckets={buckets} granularity="day" />)
    // SVG frame renders (layout continuity), with an in-chart flatline label.
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(screen.getByText(/no activity in this period/i)).toBeInTheDocument()
    // and the accessible data table fallback is still present
    expect(container.querySelector('table')).toBeInTheDocument()
  })

  it('renders an SVG and a data-table fallback for real data', () => {
    const buckets = [bucket('2026-07-01T00:00:00', 10, 1), bucket('2026-07-02T00:00:00', 20, 2)]
    const { container } = render(<TrendChart buckets={buckets} granularity="day" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
    // sr-only data table present for a11y / print
    expect(container.querySelector('table')).toBeInTheDocument()
  })

  it('handles a single data point without crashing', () => {
    render(<TrendChart buckets={[bucket('2026-07-01T00:00:00', 5, 0)]} granularity="day" />)
    expect(screen.getByText('Activity trend')).toBeInTheDocument()
  })
})
