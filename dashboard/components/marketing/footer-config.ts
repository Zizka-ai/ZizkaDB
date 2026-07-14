export type FooterLink = {
  label: string
  href: string
  external?: boolean
}

export type FooterColumn = {
  title: string
  links: FooterLink[]
}

const GITHUB = 'https://github.com/Zizka-ai/ZizkaDB'
const WIKI = 'https://github.com/Zizka-ai/ZizkaDB/wiki'
const ZIZKA_AI = 'https://zizka.ai'

export const ZIZKADB_FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'Product',
    links: [
      { label: 'Docs', href: '/docs' },
      { label: 'Enterprise', href: '/enterprise' },
      { label: 'Pricing', href: '/#pricing' },
      { label: 'Compare', href: '/#compare' },
      { label: 'Trust & security', href: '/trust' },
      { label: 'API explorer', href: '/swagger' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Self-host (OSS)', href: `${GITHUB}/wiki/Self-Hosting`, external: true },
      { label: 'GitHub', href: GITHUB, external: true },
      { label: 'Wiki', href: WIKI, external: true },
      { label: 'Community', href: '/community' },
      { label: 'MCP setup', href: `${GITHUB}/wiki/MCP-and-Cursor`, external: true },
      { label: 'Status', href: 'https://db.zizka.ai/health', external: true },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms', href: `${ZIZKA_AI}/terms`, external: true },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Security', href: '/trust#security' },
      { label: 'Contact', href: '/enterprise#contact' },
      { label: 'Responsible disclosure', href: 'mailto:founder@zizka.ai?subject=Security%20disclosure', external: true },
    ],
  },
]

export const ZIZKADB_COMPANY = {
  name: 'ZIZKA AI S.L.',
  location: 'Málaga, Spain',
  taxId: 'CIF B26956078',
  email: 'founder@zizka.ai',
  zizkaAiUrl: ZIZKA_AI,
}
