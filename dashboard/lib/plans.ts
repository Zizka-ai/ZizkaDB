/** Single source for managed-cloud plan metadata shown in signup and marketing. */

export type ManagedPlanId = 'pro' | 'team'

export interface ManagedPlanMeta {
  id: ManagedPlanId
  name: string
  price: string
  priceSub: string
  highlight: boolean
  features: readonly string[]
}

/** API key caps must match core/services/entitlements.py PLAN_ENTITLEMENTS. */
export const MANAGED_PLANS: readonly ManagedPlanMeta[] = [
  {
    id: 'pro',
    name: 'Pro',
    price: '€29',
    priceSub: '/ month',
    highlight: true,
    features: ['50k events / month', '2 active API keys', 'Email support'],
  },
  {
    id: 'team',
    name: 'Team',
    price: '€69',
    priceSub: '/ month',
    highlight: false,
    features: ['100k events / month', '5 active API keys', 'Priority support'],
  },
] as const

export function managedPlanById(id: ManagedPlanId): ManagedPlanMeta {
  return MANAGED_PLANS.find((p) => p.id === id) ?? MANAGED_PLANS[0]
}

/** Managed-cloud trial CTA. No plan → plan picker; pro/team skip straight into the funnel. */
export function startTrialHref(plan?: ManagedPlanId): string {
  if (plan === 'pro' || plan === 'team') return `/signup?plan=${plan}`
  return '/signup/plan'
}
