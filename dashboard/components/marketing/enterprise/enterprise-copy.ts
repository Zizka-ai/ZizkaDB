export const ENTERPRISE_CONTACT = 'mailto:founder@zizka.ai'
export const GITHUB_URL = 'https://github.com/Zizka-ai/ZizkaDB'

export const COPY = {
  hero: {
    eyebrow: 'ENTERPRISE',
    h1: 'Operational control for multi-agent fleets in your cloud',
    subhead:
      'Licensed, single-tenant ZizkaDB in your VPC. Your agents connect via API key plus SDK, MCP, or REST. We deploy the stack — you keep your agent codebase.',
    connectCta: "Let's connect",
    demoCta: 'Book demo',
  },
  whatIs: {
    sectionTitle: 'What ZizkaDB is',
    h2: 'Operational database for AI agents',
    lead:
      'ZizkaDB stores agent decisions, tool calls, and outcomes with causal links. It is not a vector index for RAG documents and not distributed traces (OpenTelemetry). Most teams use all three alongside each other.',
    table: [
      ['Vector DB', 'RAG / knowledge retrieval', 'Pinecone, Qdrant'],
      ['App DB', 'Transactional app state', 'Postgres, Redis'],
      ['Agent ops', 'Decision history, lineage, drift', 'ZizkaDB'],
      ['Traces', 'Spans, framework hooks', 'LangSmith, OTel'],
    ] as const,
    linkLabel: 'Read full technical reference',
    linkHref: '/trust#overview',
  },
  fleet: {
    sectionTitle: 'Multi-agent fleets',
    h2: 'One ZizkaDB instance. Many agents. Full visibility.',
    lead:
      'Each agent logs under a distinct name. Tenant-wide API keys support SaaS patterns with thousands of logical agents.',
    bullets: [
      {
        title: 'Fleet observability',
        body: 'See all agents, last seen, and session volume in one place — included in your Enterprise VPC deployment.',
      },
      {
        title: 'Behavioral drift',
        body: 'Compare recent sessions to each agent\'s baseline. Verdicts from stable to significant — operational behavior change, not hallucination detection.',
      },
      {
        title: 'Causal tracing',
        body: 'Walk decision chains with why() and replay sessions when something breaks in production.',
      },
    ],
    driftNote:
      'Drift means operational behavior change — for example tool errors up 12 percentage points. It is not hallucination detection or truth verification.',
    driftBands: {
      title: 'Drift verdict bands',
      bands: [
        { label: 'Stable', range: 'below 0.05' },
        { label: 'Minor', range: 'below 0.15' },
        { label: 'Noticeable', range: 'below 0.30' },
        { label: 'Significant', range: '0.30+' },
      ],
      requirement:
        'Requires stable session_id, consistent event types, and parent_id links between related events.',
    },
    demoCaption: 'Fleet dashboard included in Enterprise VPC deployment.',
  },
  capabilities: {
    sectionTitle: 'Capabilities',
    h2: 'Open core today. Enterprise VPC adds fleet operations.',
    lead:
      'The same ZizkaDB engine runs on GitHub (AGPL), managed cloud, and Enterprise VPC. Enterprise adds commercial license, fleet UI, audit export, and supported install.',
    openCore: {
      title: 'Open core — available today',
      subtitle: 'Works on self-host and managed cloud (db.zizka.ai)',
      rows: [
        ['Event logging', 'POST /v1/events'],
        ['Causal chain', 'GET /v1/events/{id}/why'],
        ['State at time T', 'GET /v1/events/at'],
        ['Semantic search', 'POST /v1/search'],
        ['Behavioral baseline', 'GET /v1/agents/{id}/baseline'],
        ['GDPR erasure', 'DELETE /v1/memory/forget'],
        ['Checksum-backed events', 'Per-event SHA-256'],
      ] as const,
    },
    enterprise: {
      title: 'Enterprise VPC package adds',
      items: [
        'Fleet dashboard',
        'Fleet ranking',
        'Audit export (CSV/JSON + checksums)',
        'Commercial license',
        'Supported install',
      ],
    },
    footnote:
      'Fleet UI and audit export are delivered in your VPC — not on public db.zizka.ai today.',
  },
  tierCompare: {
    sectionTitle: 'Compare tiers',
    h2: 'Open core and cloud vs Enterprise in your VPC',
    lead: 'Same ZizkaDB engine. Enterprise adds commercial license, fleet operations, and a supported install in your cloud.',
    openCore: {
      label: 'OPEN CORE & CLOUD',
      title: 'db.zizka.ai',
      features: [
        'AGPL on GitHub',
        'Self-host Docker',
        'Managed Pro / Team',
        'Per-agent dashboard',
        'Baseline / drift API',
      ],
      cta: 'Start free →',
    },
    enterprise: {
      label: 'ENTERPRISE',
      title: 'Your VPC',
      features: [
        'Commercial license',
        'Single-tenant in your cloud',
        'Fleet dashboard',
        'Audit export',
        'Install + integration workshop',
      ],
      cta: "Let's connect",
    },
  },
  vpcDeploy: {
    sectionTitle: 'Deployment',
    h2: 'Production-ready in your cloud within one week',
    lead: 'Same install package every customer. Only variables: region, sizing, DNS, secrets, and license tier.',
    points: [
      {
        title: 'No platform rewrite',
        body: 'Add ZIZKADB_HOST and ZIZKADB_API_KEY to your services. Instrument five log points per conversation — user in, tool out, tool in, model out, errors.',
      },
      {
        title: 'Your CI/CD',
        body: 'You merge and redeploy through your pipeline. Optional Launch Sprint can help instrument one or two services via pull requests.',
      },
    {
        title: 'Private network',
        body: 'Agent subnets reach ZizkaDB via same VPC, VPC peering, or PrivateLink.',
      },
    ],
    timeline: [
      { day: 'Day 0', label: 'Discovery + checklist' },
      { day: 'Day 7', label: 'Stack live in staging' },
      { day: 'Day 14', label: 'Integration workshop' },
      { day: 'Day 28', label: 'Handoff + access revoked' },
    ],
    trustLink: 'Read deployment details',
  },
  platform: {
    sectionTitle: 'Platform',
    h2: 'Everything in the install package',
    lead: 'Private images, license key, full stack, and integration kit — delivered in your VPC.',
    features: [
      {
        title: 'VPC deploy',
        body: 'Model A: Docker Compose stack in your cloud — Postgres, Qdrant, Redis, API, Dashboard.',
      },
      {
        title: 'Commercial license',
        body: 'Named organization, expiry, agent and event limits. One VPC per license.',
      },
      {
        title: 'Fleet dashboard',
        body: 'All agents with drift score, error change, and last seen — Enterprise UI in your VPC.',
      },
      {
        title: 'Drift & error metrics',
        body: 'Per-agent baseline plus fleet ranking. See what shifted before customers do.',
      },
      {
        title: 'Audit export',
        body: 'On-demand CSV or JSON with event checksums — not weekly certified reports.',
      },
      {
        title: 'Integration workshop',
        body: 'Five log points guide, staging checklist, backup and restore scripts.',
      },
    ],
    footnote:
      'SSO, SAML, and automated alerting are on the roadmap. Pilots use dashboard OTP plus VPN access.',
  },
  faq: {
    sectionTitle: 'FAQ',
    h2: 'Common enterprise questions',
    items: [
      {
        q: 'Can you deploy inside our Kubernetes cluster?',
        a: 'Version 1 is VM plus Docker Compose. Helm is available when a deal requires it.',
      },
      {
        q: 'Do you modify our agent code?',
        a: 'Optional Launch Sprint can open pull requests on one or two services. Default path: your developers plus our integration kit.',
      },
      {
        q: 'How is this different from self-hosting from GitHub?',
        a: 'AGPL open core vs commercial license, enterprise features, fleet dashboard, audit export, and a supported install.',
      },
      {
        q: 'How is Enterprise different from Pro or Team cloud?',
        a: 'We host multi-tenant SaaS on db.zizka.ai. Enterprise is single-tenant in your VPC with a commercial license.',
      },
      {
        q: 'Can we run a POC without a VPC?',
        a: 'Cloud trial works for developer evaluation. Enterprise pilot expects deployment in your VPC.',
      },
      {
        q: 'PII and GDPR?',
        a: 'You control data. forget() deletes by metadata filter. Self-host and VPC deployments keep data in your infrastructure.',
        link: { label: 'Security details', href: '/trust#security' },
      },
      {
        q: 'How is this different from LangSmith / Mem0?',
        a: 'LangSmith focuses on framework-centric tracing and evals. Mem0 optimizes long-term memory retrieval. ZizkaDB is a standalone operational store with causal trees, time travel, and fleet baselines.',
        link: { label: 'Full comparison', href: '/trust#comparison' },
      },
    ],
  },
  footerCta: {
    h2: 'Ready to deploy in your VPC?',
    subhead: 'Tell us about your agent fleet. We will map a 4 week install path or point you to managed cloud.',
    demoCta: 'Book demo',
    cloudCta: 'ZizkaDB Cloud →',
  },
  form: {
    success: 'Thanks — we will reach out within one business day.',
    rateLimit: 'Too many requests. Try again later or email founder@zizka.ai.',
    genericError: 'Something went wrong. Email founder@zizka.ai and we will help.',
    websiteHint: 'Company domain or linkedin.com/company/…',
  },
} as const

export const TECHNICAL_LINKS = [
  { label: 'Overview', href: '/trust#overview', desc: 'What ZizkaDB is and how it fits your stack' },
  { label: 'Technical reference', href: '/trust', desc: 'Architecture, APIs, data model' },
  { label: 'Security', href: '/trust#security', desc: 'TLS, tenant isolation, GDPR' },
  { label: 'Integrity', href: '/trust#integrity', desc: 'Checksums and retention' },
  { label: 'Deployment modes', href: '/trust#deployment', desc: 'Self-host, managed, Enterprise VPC' },
  { label: 'Plan limits', href: '/trust#limits', desc: 'Events and retention by tier' },
  { label: 'Licensing', href: '/trust#licensing', desc: 'AGPL vs commercial' },
  { label: 'Comparison', href: '/trust#comparison', desc: 'vs LangSmith, Mem0, Pinecone' },
  { label: 'API reference', href: '/swagger', desc: 'REST explorer' },
  { label: 'Documentation', href: '/docs', desc: 'SDK, MCP, integration guides' },
  { label: 'Open source', href: GITHUB_URL, desc: 'AGPL core on GitHub', external: true },
  { label: 'Contact', href: ENTERPRISE_CONTACT, desc: 'Security review + sales', external: true },
  { label: 'Managed cloud', href: '/signup', desc: 'Pro / Team free trial' },
] as const

export const INTEGRATION_SNIPPET = `ZIZKADB_HOST=https://zizkadb.internal.your-company.example
ZIZKADB_API_KEY=zizkadb_live_...`

export const LOG_POINTS = [
  'User message in',
  'Tool call out',
  'Tool result in',
  'Model response out',
  'Errors',
]
