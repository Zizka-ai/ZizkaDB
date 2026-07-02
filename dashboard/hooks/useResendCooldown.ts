'use client'

import { useCallback, useEffect, useState } from 'react'

const DEFAULT_SECONDS = 60

export function useResendCooldown(seconds = DEFAULT_SECONDS) {
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => {
      setCooldown((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  const startCooldown = useCallback(() => {
    setCooldown(seconds)
  }, [seconds])

  return { cooldown, canResend: cooldown === 0, startCooldown }
}
