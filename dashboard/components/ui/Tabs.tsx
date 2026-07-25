'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { colors, radii } from '@/lib/design-tokens'

export interface TabItem {
  href: string
  label: string
  /** Marks the tab active; computed by the caller from the pathname. */
  active: boolean
}

/**
 * Horizontal, accessible tab bar.
 *
 * Tabs are real links (not buttons) so each is a route — that keeps browser
 * back/forward, refresh and sharing working, and lets Next prefetch.
 * Overflows horizontally on small screens rather than wrapping or squashing.
 */
export function Tabs({ items, ariaLabel = 'Sections' }: { items: TabItem[]; ariaLabel?: string }) {
  const listRef = useRef<HTMLDivElement>(null)

  // Arrow-key traversal across the tab list (WAI-ARIA tabs pattern).
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const links = Array.from(
      listRef.current?.querySelectorAll<HTMLAnchorElement>('a[role="tab"]') ?? [],
    )
    if (links.length === 0) return

    const current = links.findIndex((el) => el === document.activeElement)
    const delta = e.key === 'ArrowRight' ? 1 : -1
    const next = (current < 0 ? 0 : current + delta + links.length) % links.length

    e.preventDefault()
    links[next]?.focus()
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className="flex items-center gap-1 overflow-x-auto"
      style={{ borderBottom: `1px solid ${colors.border}`, scrollbarWidth: 'thin' }}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          role="tab"
          aria-selected={item.active}
          aria-current={item.active ? 'page' : undefined}
          className="whitespace-nowrap px-3 py-2.5 text-sm transition shrink-0"
          style={{
            color: item.active ? colors.textStrong : colors.textMuted,
            borderBottom: `2px solid ${item.active ? colors.info : 'transparent'}`,
            borderTopLeftRadius: radii.sm,
            borderTopRightRadius: radii.sm,
            marginBottom: -1,
          }}
        >
          {item.label}
        </Link>
      ))}
    </div>
  )
}
