'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { BrandLogo } from '@/components/BrandLogo'
import { SIGNUP_CONSENT_GDPR_KEY, SIGNUP_CONSENT_MARKETING_KEY, SIGNUP_PLAN_KEY, getStoredSignupPlan } from '@/lib/signup-funnel'

const GUIDELINES = [
  {
    title: 'Log every agent step',
    body: 'Use db.log() with a consistent session_id for each conversation. Link tool calls and responses so baselines and drift detection work from day one.',
  },
  {
    title: 'Create an agent, then connect',
    body: 'After signup, open the dashboard → create an agent → copy your API key. Connect via Python SDK, TypeScript SDK, MCP, or REST.',
  },
  {
    title: 'Review behavior early',
    body: 'Once you have a few sessions, use semantic search and baselines in the dashboard to spot when your agent starts behaving differently.',
  },
]

function StartFallback() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#fafafa', fontFamily: 'Inter, system-ui, sans-serif', color: '#888',
    }}>
      Loading…
    </div>
  )
}

export default function SignupStartPage() {
  return (
    <Suspense fallback={<StartFallback />}>
      <SignupStartInner />
    </Suspense>
  )
}

function SignupStartInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [plan, setPlan] = useState<'pro' | 'team' | null>(null)
  const [gdprConsent, setGdprConsent] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)

  useEffect(() => {
    const planParam = searchParams.get('plan')
    const resolved =
      planParam === 'pro' || planParam === 'team'
        ? planParam
        : getStoredSignupPlan()
    if (!resolved) {
      router.replace('/signup/plan')
      return
    }
    sessionStorage.setItem(SIGNUP_PLAN_KEY, resolved)
    setPlan(resolved)
  }, [searchParams, router])

  function handleContinue() {
    if (!plan || !gdprConsent) return
    sessionStorage.setItem(SIGNUP_CONSENT_GDPR_KEY, '1')
    sessionStorage.setItem(SIGNUP_CONSENT_MARKETING_KEY, marketingConsent ? '1' : '0')
    router.push(`/signup?plan=${plan}`)
  }

  if (!plan) return <StartFallback />

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#fafafa', fontFamily: 'Inter, system-ui, sans-serif', padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <BrandLogo variant="full" suffix="Get started with ZizkaDB" />
        </div>

        <div style={{
          background: '#fff', borderRadius: 16, padding: '28px 24px',
          border: '1px solid #e5e5e5', boxShadow: '0 2px 20px rgba(0,0,0,0.05)',
        }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111', margin: '0 0 8px', textAlign: 'center' }}>
            Before you begin
          </h1>
          <p style={{ fontSize: 14, color: '#666', margin: '0 0 24px', lineHeight: 1.6, textAlign: 'center' }}>
            Three quick tips to get the most from your {plan === 'team' ? 'Team' : 'Pro'} trial.
          </p>

          <ol style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {GUIDELINES.map((item, i) => (
              <li
                key={item.title}
                style={{
                  display: 'flex', gap: 14, padding: '16px 18px', borderRadius: 12,
                  background: '#fafafa', border: '1px solid #eee',
                }}
              >
                <span style={{
                  flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
                  background: '#111', color: '#fff', fontSize: 13, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {i + 1}
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: '#555', lineHeight: 1.55 }}>{item.body}</div>
                </div>
              </li>
            ))}
          </ol>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', fontSize: 13, color: '#333', lineHeight: 1.55 }}>
              <input
                type="checkbox"
                checked={gdprConsent}
                onChange={(e) => setGdprConsent(e.target.checked)}
                style={{ marginTop: 3, flexShrink: 0 }}
              />
              <span>
                I agree that my data will be processed in accordance with{' '}
                <strong>GDPR</strong> and the <strong>EU AI Act</strong>.{' '}
                <span style={{ color: '#ef4444' }}>*</span>
              </span>
            </label>

            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', fontSize: 13, color: '#555', lineHeight: 1.55 }}>
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                style={{ marginTop: 3, flexShrink: 0 }}
              />
              <span>
                I would like to receive information about ZizkaDB products and services (optional).
              </span>
            </label>
          </div>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!gdprConsent}
            style={{
              width: '100%', padding: '12px', borderRadius: 10,
              fontSize: 14, fontWeight: 600, border: 'none', cursor: gdprConsent ? 'pointer' : 'not-allowed',
              background: '#111', color: '#fff',
              opacity: gdprConsent ? 1 : 0.45,
            }}
          >
            Continue to create account →
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#aaa', marginTop: 20 }}>
          <Link href="/signup/plan" style={{ color: '#555', textDecoration: 'none' }}>
            ← Change plan
          </Link>
        </p>
      </div>
    </div>
  )
}
