export interface PricingPlan {
  name: string
  price: string
  sub: string
  features: readonly string[]
  cta: string
  href: string
  highlight: boolean
  ctaPrimary?: boolean
  note?: string
}

export const LANDING_PRICING_PLANS: readonly PricingPlan[] = [
  {
    name: 'Self-Hosted',
    price: 'Free',
    sub: 'forever',
    features: ['1 API key', 'Your infrastructure', 'Docker Compose', 'Community support'],
    cta: 'Setup guide',
    href: '/docs',
    highlight: false,
    ctaPrimary: false,
    note: '',
  },
  {
    name: 'Pro',
    price: '\u20ac39',
    sub: '/ month',
    features: ['1 million events / month', '2 projects', '30-day free trial', 'Email support'],
    cta: 'Start free trial',
    href: '/signup?plan=pro',
    highlight: true,
    ctaPrimary: true,
    note: '30-day free trial, no card required',
  },
  {
    name: 'Team',
    price: '\u20ac99',
    sub: '/ month',
    features: ['5 million events / month', '5 projects', '30-day free trial', 'Priority support'],
    cta: 'Start free trial',
    href: '/signup?plan=team',
    highlight: false,
    ctaPrimary: false,
    note: '30-day free trial, no card required',
  },
  {
    name: 'Enterprise',
    price: 'Growth VPC',
    sub: 'Annual License',
    features: [
      'Single-tenant VPC deployment',
      'Up to 50 agents',
      'Fleet dashboard and ranking',
      'Audit export with checksums',
      'Commercial license (1 year)',
      'Week-1 install + integration workshop',
    ],
    cta: "Let's Connect",
    href: '/enterprise#contact',
    highlight: false,
    ctaPrimary: true,
    note: '',
  },
]
