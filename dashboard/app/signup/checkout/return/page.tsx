'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Legacy Stripe checkout return URL — billing no longer uses checkout. */
export default function CheckoutReturnPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard')
  }, [router])

  return null
}
