'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  type AudienceSegment,
  getStoredSegment,
  storeSegment,
  trackMarketingEvent,
} from '@/lib/marketing-track'

export type { AudienceSegment }

type LandingContextValue = {
  segment: AudienceSegment
  setSegment: (s: AudienceSegment) => void
  track: (event: Parameters<typeof trackMarketingEvent>[0], payload?: Record<string, unknown>) => void
  demoOpen: boolean
  setDemoOpen: (open: boolean) => void
}

const LandingContext = createContext<LandingContextValue | null>(null)

export function LandingProvider({ children }: { children: ReactNode }) {
  const [segment, setSegmentState] = useState<AudienceSegment>('managed')
  const [demoOpen, setDemoOpen] = useState(false)

  useEffect(() => {
    const stored = getStoredSegment()
    if (stored) setSegmentState(stored)
    trackMarketingEvent('page_view', { referrer: document.referrer || null }, stored ?? 'managed')
  }, [])

  const setSegment = useCallback((s: AudienceSegment) => {
    setSegmentState(s)
    storeSegment(s)
    trackMarketingEvent('segment_select', { segment: s }, s)
  }, [])

  const track = useCallback(
    (event: Parameters<typeof trackMarketingEvent>[0], payload?: Record<string, unknown>) => {
      trackMarketingEvent(event, payload ?? {}, segment)
    },
    [segment],
  )

  const value = useMemo(
    () => ({ segment, setSegment, track, demoOpen, setDemoOpen }),
    [segment, setSegment, track, demoOpen],
  )

  return <LandingContext.Provider value={value}>{children}</LandingContext.Provider>
}

export function useLanding() {
  const ctx = useContext(LandingContext)
  if (!ctx) throw new Error('useLanding must be used within LandingProvider')
  return ctx
}
