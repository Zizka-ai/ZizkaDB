import { BRAND } from '@/components/brand'
import Link from 'next/link'
import { M } from './marketing-theme'
import type { PricingPlan } from './pricing-plans'

export function PricingCard({ plan }: { plan: PricingPlan }) {
  const filledCta = plan.highlight || plan.ctaPrimary

  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: '28px 24px',
      border: plan.highlight ? `2px solid ${BRAND}` : `1px solid ${M.line}`,
      position: 'relative',
      boxShadow: plan.highlight ? '0 12px 40px rgba(249,115,22,0.1)' : 'none',
    }}>
      {plan.highlight && (
        <div style={{
          position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
          background: BRAND, color: '#fff', fontSize: 10, fontWeight: 700,
          padding: '3px 12px', borderRadius: 100,
        }}>
          POPULAR
        </div>
      )}
      <div style={{ fontSize: 12, fontWeight: 800, color: '#000', marginBottom: 8 }}>{plan.name}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 16 }}>
        <span style={{ fontSize: 32, fontWeight: 700, color: '#000' }}>{plan.price}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#000' }}>{plan.sub}</span>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {plan.features.map(f => (
          <li key={f} style={{ fontSize: 13.5, color: '#000', display: 'flex', gap: 8, fontWeight: 500 }}>
            <span style={{ color: '#000', fontWeight: 800 }}>✓</span> {f}
          </li>
        ))}
      </ul>
      <Link href={plan.href} style={{
        display: 'block', textAlign: 'center', padding: '11px', borderRadius: 10,
        textDecoration: 'none', fontWeight: 600, fontSize: 14,
        background: filledCta ? BRAND : '#fff',
        color: filledCta ? '#fff' : '#000',
        border: filledCta ? 'none' : `1px solid ${M.line}`,
      }}>
        {plan.cta}
      </Link>
      {plan.note ? (
        <p style={{ textAlign: 'center', fontSize: 11, color: '#555', marginTop: 8, marginBottom: 0, fontWeight: 600 }}>{plan.note}</p>
      ) : null}
    </div>
  )
}
