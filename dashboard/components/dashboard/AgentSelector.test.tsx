import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Agent } from '@/lib/api'
import { AgentSelector } from './AgentSelector'

function agents(n: number): Agent[] {
  return Array.from(
    { length: n },
    (_, i) =>
      ({
        agent: `agent-${i}`,
        first_seen: '2026-01-01T00:00:00Z',
        last_seen: '2026-01-01T00:00:00Z',
        event_count: i,
      }) as Agent,
  )
}

describe('AgentSelector', () => {
  it('renders nothing when there are no agents', () => {
    const { container } = render(
      <AgentSelector agents={[]} selected={null} onSelect={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  // OSS: never ask the user to pick from a list of one.
  it('shows a plain label, not a dropdown, for a single agent', () => {
    render(<AgentSelector agents={agents(1)} selected="agent-0" onSelect={() => {}} />)
    expect(screen.getByText('agent-0')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /select agent/i })).toBeNull()
  })

  it('opens a listbox and reports the chosen agent', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<AgentSelector agents={agents(3)} selected="agent-0" onSelect={onSelect} />)

    await user.click(screen.getByRole('button', { name: /select agent/i }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await user.click(screen.getByRole('option', { name: /agent-2/ }))
    expect(onSelect).toHaveBeenCalledWith('agent-2')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('offers a filter box only once the list gets long', async () => {
    const user = userEvent.setup()
    const { unmount } = render(
      <AgentSelector agents={agents(3)} selected="agent-0" onSelect={() => {}} />,
    )
    await user.click(screen.getByRole('button', { name: /select agent/i }))
    expect(screen.queryByLabelText('Filter agents')).toBeNull()
    unmount()

    render(<AgentSelector agents={agents(20)} selected="agent-0" onSelect={() => {}} />)
    await user.click(screen.getByRole('button', { name: /select agent/i }))
    await user.type(screen.getByLabelText('Filter agents'), 'agent-12')
    expect(screen.getAllByRole('option')).toHaveLength(1)
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    render(<AgentSelector agents={agents(3)} selected="agent-0" onSelect={() => {}} />)
    await user.click(screen.getByRole('button', { name: /select agent/i }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).toBeNull()
  })
})
