import { BRAND } from '@/components/brand'
import Link from 'next/link'
import { M, pricingCardShell, pricingCtaStyle } from './marketing-theme'
import type { PricingPlan } from './pricing-plans'

export function PricingCard({ plan }: { plan: PricingPlan }) {
  const filledCta = !!(plan.highlight || plan.ctaPrimary)
  const compactPrice = plan.price.length > 12

  return (
    <div
      className="zdb-pricing-card"
      style={{
        ...pricingCardShell,
        border: plan.highlight ? `2px solid ${BRAND}` : `1px solid ${M.line}`,
        position: 'relative',
        boxShadow: plan.highlight ? '0 12px 40px rgba(249,115,22,0.1)' : 'none',
      }}
    >
      {plan.highlight && (
        <div style={{
          position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
          background: BRAND, color: '#fff', fontSize: 10, fontWeight: 700,
          padding: '3px 12px', borderRadius: 100, letterSpacing: 0.3,
        }}>
          POPULAR
        </div>
      )}

      <div className="zdb-pricing-card-header">
        <div style={{ fontSize: 12, fontWeight: 800, color: M.ink, marginBottom: 8, letterSpacing: 0.2 }}>
          {plan.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 16, minHeight: 40 }}>
          <span style={{
            fontSize: compactPrice ? 22 : 32,
            fontWeight: 700,
            color: M.ink,
            lineHeight: 1.15,
          }}>
            {plan.price}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: M.ink }}>{plan.sub}</span>
        </div>
      </div>

      <ul
        className="zdb-pricing-card-body"
        style={{
          listStyle: 'none', padding: 0, margin: 0,
          display: 'flex', flexDirection: 'column', gap: 8, flex: 1,
        }}
      >
        {plan.features.map(f => (
          <li key={f} style={{ fontSize: 13.5, color: M.ink, display: 'flex', gap: 8, fontWeight: 500, lineHeight: 1.45 }}>
            <span style={{ color: M.ink, fontWeight: 800, flexShrink: 0 }}>✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="zdb-pricing-card-footer" style={{ marginTop: 'auto', paddingTop: 20 }}>
        <Link
          href={plan.href}
          style={{
            ...pricingCtaStyle(filledCta),
            display: 'block',
            textAlign: 'center',
          }}
        >
          {plan.cta}
        </Link>
        <div style={{ minHeight: 40, marginTop: 8 }}>
          {plan.note ? (
            <p style={{
              textAlign: 'center', fontSize: 11, color: '#555',
              margin: 0, fontWeight: 600, lineHeight: 1.4,
            }}>
              {plan.note}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
