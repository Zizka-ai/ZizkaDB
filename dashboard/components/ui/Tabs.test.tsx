import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tabs, type TabItem } from './Tabs'

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode
    href: string
  } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const OSS_TABS: TabItem[] = [
  { href: '/dashboard/activity', label: 'Activity', active: true },
  { href: '/dashboard/behavior', label: 'Agent Behavior', active: false },
  { href: '/dashboard/reports', label: 'Reports', active: false },
  { href: '/dashboard/suggestions', label: 'Suggestions', active: false },
]

const MANAGED_TABS: TabItem[] = [
  ...OSS_TABS,
  { href: '/dashboard/fleet', label: 'Agent Fleets', active: false },
]

describe('Tabs', () => {
  it('renders four tabs for the open-source edition', () => {
    render(<Tabs items={OSS_TABS} />)
    expect(screen.getAllByRole('tab')).toHaveLength(4)
    expect(screen.queryByText('Agent Fleets')).toBeNull()
  })

  it('renders five tabs including Agent Fleets for managed plans', () => {
    render(<Tabs items={MANAGED_TABS} />)
    expect(screen.getAllByRole('tab')).toHaveLength(5)
    expect(screen.getByText('Agent Fleets')).toBeInTheDocument()
  })

  it('exposes the active tab via aria-selected', () => {
    render(<Tabs items={OSS_TABS} />)
    expect(screen.getByRole('tab', { name: 'Activity' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Reports' })).toHaveAttribute('aria-selected', 'false')
  })

  it('moves focus with arrow keys and wraps around', async () => {
    const user = userEvent.setup()
    render(<Tabs items={OSS_TABS} />)
    const tabs = screen.getAllByRole('tab')

    tabs[0].focus()
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(tabs[1])

    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(document.activeElement).toBe(tabs[3])
  })

  it('is a tablist with an accessible name', () => {
    render(<Tabs items={OSS_TABS} ariaLabel="Dashboard sections" />)
    expect(screen.getByRole('tablist', { name: 'Dashboard sections' })).toBeInTheDocument()
  })
})
