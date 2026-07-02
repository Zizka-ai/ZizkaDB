'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SignupCheckoutRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/signup/plan')
  }, [router])

  return null
}
