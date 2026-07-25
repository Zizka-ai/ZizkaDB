import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Agent } from '@/lib/api'
import { FleetTable } from './FleetTable'

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

function agent(over: Partial<Agent> = {}): Agent {
  return {
    agent: 'support-bot',
    first_seen: '2026-01-01T00:00:00Z',
    last_seen: new Date().toISOString(),
    event_count: 1234,
    ...over,
  } as Agent
}

describe('FleetTable', () => {
  it('renders a row per agent with its event count', () => {
    render(
      <FleetTable
        agents={[agent(), agent({ agent: 'triage-bot', event_count: 7 })]}
        onDelete={() => {}}
        deletingAgent={null}
      />,
    )
    expect(screen.getByText('support-bot')).toBeInTheDocument()
    expect(screen.getByText('triage-bot')).toBeInTheDocument()
    expect(screen.getByText('1,234')).toBeInTheDocument()
  })

  // "Active Threads" appears in the design mockups but `thread_id` does not
  // exist in the schema — there is nothing truthful to show, so it stays out.
  it('does not render an Active Threads column', () => {
    render(<FleetTable agents={[agent()]} onDelete={() => {}} deletingAgent={null} />)
    expect(screen.queryByText(/active threads/i)).toBeNull()
  })

  it('links each agent to its Activity view, encoding the name', () => {
    render(
      <FleetTable agents={[agent({ agent: 'a/b bot' })]} onDelete={() => {}} deletingAgent={null} />,
    )
    expect(screen.getByRole('link', { name: 'a/b bot' })).toHaveAttribute(
      'href',
      '/dashboard/activity?agent=a%2Fb%20bot',
    )
  })

  it('shows status as text, not colour alone', () => {
    render(<FleetTable agents={[agent()]} onDelete={() => {}} deletingAgent={null} />)
    expect(screen.getByText('Healthy')).toBeInTheDocument()
  })

  it('marks an agent with no recent activity as idle', () => {
    render(
      <FleetTable
        agents={[agent({ last_seen: '2020-01-01T00:00:00Z' })]}
        onDelete={() => {}}
        deletingAgent={null}
      />,
    )
    expect(screen.getByText('No recent activity')).toBeInTheDocument()
  })

  it('disables the delete button for the agent being deleted', () => {
    render(<FleetTable agents={[agent()]} onDelete={() => {}} deletingAgent="support-bot" />)
    expect(screen.getByRole('button', { name: /delete agent support-bot/i })).toBeDisabled()
  })
})
