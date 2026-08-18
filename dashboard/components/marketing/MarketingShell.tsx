'use client'

import type { ReactNode } from 'react'
import { SiteNav, type SiteNavActive } from '@/components/SiteNav'
import { MarketingFooter } from './MarketingFooter'
import { MarketingPageStyles } from './MarketingPageStyles'
import { M } from './marketing-theme'

type Props = {
  children: ReactNode
  active?: SiteNavActive
  suffix?: string
  /** Skip footer on minimal auth screens if needed */
  showFooter?: boolean
}

export function MarketingShell({ children, active, suffix, showFooter = true }: Props) {
  return (
    <div
      className="zdb-marketing-root"
      style={{
        minHeight: '100vh',
        fontFamily: 'Inter, system-ui, sans-serif',
        color: M.ink,
        background: M.bg,
      }}
    >
      <MarketingPageStyles />
      <SiteNav active={active} suffix={suffix} />
      {children}
      {showFooter ? <MarketingFooter /> : null}
    </div>
  )
}
