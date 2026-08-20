import { describe, it, expect } from 'vitest'
import { MANAGED_PLANS, managedPlanById } from './plans'

describe('MANAGED_PLANS', () => {
  it('defines pro and team with matching API key caps', () => {
    const pro = MANAGED_PLANS.find((p) => p.id === 'pro')
    const team = MANAGED_PLANS.find((p) => p.id === 'team')
    expect(pro?.features).toContain('2 active API keys')
    expect(team?.features).toContain('5 active API keys')
  })

  it('managedPlanById returns pro for unknown ids', () => {
    expect(managedPlanById('pro').id).toBe('pro')
    // @ts-expect-error exercising fallback for invalid runtime input
    expect(managedPlanById('unknown').id).toBe('pro')
  })
})
