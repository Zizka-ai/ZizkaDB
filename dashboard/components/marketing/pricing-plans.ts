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
  },
  {
    name: 'Pro',
    price: '\u20ac29',
    sub: '/ month',
    features: ['50k events / month', '2 projects', '30-day free trial', 'Email support'],
    cta: 'Start free trial',
    href: '/signup?plan=pro',
    highlight: true,
    ctaPrimary: true,
  },
  {
    name: 'Team',
    price: '\u20ac69',
    sub: '/ month',
    features: ['100k events / month', '5 projects', '30-day free trial', 'Priority support'],
    cta: 'Start free trial',
    href: '/signup?plan=team',
    highlight: false,
    ctaPrimary: false,
  },
  {
    name: 'Enterprise',
    price: 'Annual License',
    sub: '1 Year',
    features: [
      'Single-tenant VPC deployment',
      'Up to 50 agents',
      'Fleet dashboard and ranking',
      'Install + integration workshop',
    ],
    cta: "Let's Connect",
    href: '/enterprise#contact',
    highlight: false,
    ctaPrimary: true,
  },
]
