'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { BrandLogo } from '@/components/BrandLogo'
import { getToken } from '@/lib/auth'
import {
  billingGateRedirect,
  getBillingConfig,
  getBillingStatus,
  selectBillingPlan,
  type BillingPlan,
} from '@/lib/api'

const BRAND = '#f97316'

function PlanFallback() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#fafafa', fontFamily: 'Inter, system-ui, sans-serif', color: '#888',
    }}>
      Loading plans…
    </div>
  )
}

export default function SignupPlanPage() {
  return (
    <Suspense fallback={<PlanFallback />}>
      <SignupPlanInner />
    </Suspense>
  )
}

function SignupPlanInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [plans, setPlans] = useState<BillingPlan[]>([])
  const [trialDays, setTrialDays] = useState(30)
  const [selected, setSelected] = useState<'pro' | 'team' | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.replace('/signup')
      return
    }

    const hinted = searchParams.get('plan')
    const stored =
      typeof window !== 'undefined' ? sessionStorage.getItem('signup_plan') : null
    const preselect =
      hinted === 'pro' || hinted === 'team'
        ? hinted
        : stored === 'pro' || stored === 'team'
          ? stored
          : null
    if (preselect) setSelected(preselect)

    let cancelled = false

    async function init() {
      try {
        const [config, status] = await Promise.all([
          getBillingConfig(),
          getBillingStatus(token!),
        ])
        if (cancelled) return

        if (!config.enforced || status.has_access) {
          router.replace('/dashboard')
          return
        }

        const gate = billingGateRedirect(status)
        if (gate && gate.startsWith('/signup/checkout')) {
          router.replace(gate)
          return
        }

        setPlans(config.plans)
        setTrialDays(config.trial_days ?? 30)
        if (status.plan === 'pro' || status.plan === 'team') {
          setSelected(status.plan)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load plans')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
  }, [router, searchParams])

  async function handleContinue() {
    if (!selected) return
    const token = getToken()
    if (!token) {
      router.replace('/signup')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await selectBillingPlan(token, selected)
      sessionStorage.removeItem('signup_plan')
      router.replace(`/signup/checkout?plan=${selected}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save plan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#fafafa', fontFamily: 'Inter, system-ui, sans-serif', padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 720 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <BrandLogo variant="full" suffix="Choose your plan" />
        </div>

        <div style={{
          background: '#fff', borderRadius: 16, padding: '28px 24px',
          border: '1px solid #e5e5e5', boxShadow: '0 2px 20px rgba(0,0,0,0.05)',
        }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111', margin: '0 0 8px', textAlign: 'center' }}>
            Select a package
          </h1>
          <p style={{ fontSize: 14, color: '#666', margin: '0 0 24px', lineHeight: 1.6, textAlign: 'center' }}>
            {trialDays}-day free trial on every plan. Card required — you won&apos;t be charged until the trial ends.
          </p>

          {loading && (
            <p style={{ fontSize: 14, color: '#888', textAlign: 'center', padding: '32px 0' }}>
              Loading plans…
            </p>
          )}

          {error && (
            <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 16, textAlign: 'center' }}>{error}</p>
          )}

          {!loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              {plans.map((plan) => {
                const isSelected = selected === plan.id
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelected(plan.id)}
                    style={{
                      textAlign: 'left', cursor: 'pointer', borderRadius: 14, padding: '22px 20px',
                      border: isSelected
                        ? `2px solid ${BRAND}`
                        : plan.highlight
                          ? `2px solid ${BRAND}33`
                          : '1px solid #e5e5e5',
                      background: isSelected ? '#fff7ed' : '#fff',
                      boxShadow: isSelected ? '0 8px 24px rgba(249,115,22,0.12)' : 'none',
                      position: 'relative',
                    }}
                  >
                    {plan.highlight && (
                      <span style={{
                        position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                        background: BRAND, color: '#fff', fontSize: 10, fontWeight: 700,
                        padding: '3px 10px', borderRadius: 100,
                      }}>
                        POPULAR
                      </span>
                    )}
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#111', marginBottom: 8 }}>{plan.name}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 14 }}>
                      <span style={{ fontSize: 28, fontWeight: 700, color: '#111' }}>{plan.price}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#666' }}>{plan.price_sub}</span>
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {plan.features.map((f) => (
                        <li key={f} style={{ fontSize: 13, color: '#333', display: 'flex', gap: 8 }}>
                          <span style={{ color: '#111', fontWeight: 800 }}>✓</span> {f}
                        </li>
                      ))}
                    </ul>
                    {isSelected && (
                      <p style={{ margin: '14px 0 0', fontSize: 12, fontWeight: 700, color: BRAND }}>
                        Selected
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {!loading && plans.length > 0 && (
            <button
              type="button"
              onClick={handleContinue}
              disabled={!selected || submitting}
              style={{
                width: '100%', marginTop: 24, padding: '12px', borderRadius: 10,
                fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: '#111', color: '#fff',
                opacity: !selected || submitting ? 0.45 : 1,
              }}
            >
              {submitting ? 'Continuing…' : 'Continue to payment →'}
            </button>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#aaa', marginTop: 20 }}>
          <Link href="/login" style={{ color: '#555', textDecoration: 'none' }}>← Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
