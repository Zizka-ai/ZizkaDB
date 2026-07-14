import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalDocumentLayout, legalStyles as S } from '@/components/marketing/LegalDocumentLayout'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy for ZizkaDB and ZIZKA AI S.L. — GDPR-compliant data processing for managed cloud and website services.',
}

export default function PrivacyPolicyPage() {
  return (
    <LegalDocumentLayout title="Privacy Policy" updated="14 July 2026">
      <p style={S.p}>
        This Privacy Policy explains how <strong>ZIZKA AI S.L.</strong> (&quot;ZIZKA AI&quot;, &quot;we&quot;, &quot;us&quot;)
        processes personal data when you use <strong>ZizkaDB</strong> at{' '}
        <Link href="/" style={S.a}>db.zizka.ai</Link>, our managed cloud service, documentation, and related websites.
        It is written to comply with the EU General Data Protection Regulation (GDPR) and applicable Spanish data protection law.
      </p>

      <h2 style={S.h2}>1. Data controller</h2>
      <p style={S.p}>
        <strong>ZIZKA AI S.L.</strong><br />
        Málaga, Spain<br />
        CIF B26956078<br />
        Email: <a href="mailto:privacy@zizka.ai" style={S.a}>privacy@zizka.ai</a>
      </p>
      <p style={S.p}>
        For data protection enquiries or to exercise your rights, contact us at the address above.
        You may also contact <a href="mailto:founder@zizka.ai" style={S.a}>founder@zizka.ai</a>.
      </p>

      <h2 style={S.h2}>2. Scope of this policy</h2>
      <p style={S.p}>This policy applies to:</p>
      <ul style={S.ul}>
        <li style={S.li}><strong>Managed cloud</strong> — accounts, API keys, dashboards, and billing at db.zizka.ai</li>
        <li style={S.li}><strong>Website and marketing</strong> — pages, forms, demo requests, and optional newsletter subscriptions</li>
        <li style={S.li}><strong>Support and sales contact</strong> — email and contact forms</li>
      </ul>
      <p style={S.p}>
        <strong>Self-hosted ZizkaDB (OSS):</strong> If you run ZizkaDB on your own infrastructure, you are the{' '}
        <em>data controller</em> for data stored in your instance. We do not access your self-hosted database unless
        you voluntarily share logs or contact support. Open-source downloads and local Docker usage on your machine
        are outside our control as controller.
      </p>

      <h2 style={S.h2}>3. Personal data we process</h2>
      <p style={S.p}>Depending on how you use ZizkaDB, we may process:</p>
      <ul style={S.ul}>
        <li style={S.li}><strong>Account data</strong> — email address, name (if provided), tenant and user identifiers, authentication tokens</li>
        <li style={S.li}><strong>Billing data</strong> — subscription plan, payment status; card details are processed by our payment provider (we do not store full card numbers)</li>
        <li style={S.li}><strong>Operational / agent data</strong> — events, agent names, session metadata, and payloads you log via the API or SDK (this may include personal data if you choose to log it)</li>
        <li style={S.li}><strong>Technical data</strong> — IP address, browser type, device information, API request logs, error reports</li>
        <li style={S.li}><strong>Communications</strong> — messages you send via contact or enterprise forms</li>
        <li style={S.li}><strong>Cookie / local storage data</strong> — consent preferences and session identifiers (see Section 9)</li>
        <li style={S.li}><strong>Optional telemetry</strong> — anonymous SDK install metrics if not disabled (<code style={{ fontFamily: 'monospace', fontSize: 13 }}>ZIZKADB_TELEMETRY=false</code>)</li>
      </ul>

      <h2 style={S.h2}>4. Purposes and legal bases (GDPR Art. 6)</h2>
      <ul style={S.ul}>
        <li style={S.li}>
          <strong>Provide the service</strong> (account, API, dashboard, support) —{' '}
          <em>performance of a contract</em> (Art. 6(1)(b))
        </li>
        <li style={S.li}>
          <strong>Billing and fraud prevention</strong> — <em>performance of a contract</em> and{' '}
          <em>legitimate interests</em> (Art. 6(1)(b), (f))
        </li>
        <li style={S.li}>
          <strong>Security, abuse prevention, and service reliability</strong> —{' '}
          <em>legitimate interests</em> (Art. 6(1)(f))
        </li>
        <li style={S.li}>
          <strong>Product improvement and aggregated analytics</strong> —{' '}
          <em>legitimate interests</em>, where not overridden by your rights (Art. 6(1)(f))
        </li>
        <li style={S.li}>
          <strong>Marketing communications</strong> (e.g. product updates you subscribe to) —{' '}
          <em>consent</em> (Art. 6(1)(a)); you may withdraw at any time
        </li>
        <li style={S.li}>
          <strong>Legal obligations</strong> — e.g. tax and accounting records (Art. 6(1)(c))
        </li>
      </ul>
      <p style={S.p}>
        Where we rely on legitimate interests, we balance our interests against your rights. You may object to
        processing based on legitimate interests (see Section 8).
      </p>

      <h2 style={S.h2}>5. Agent and event data</h2>
      <p style={S.p}>
        ZizkaDB stores operational data about AI agents (events, causal links, embeddings for search, baselines).
        <strong> You control what is logged.</strong> Do not log special category data (health, biometrics, etc.)
        unless you have a lawful basis and appropriate safeguards. If you log personal data about third parties
        (e.g. end users of your agents), you are responsible for providing notice and obtaining any required consents.
      </p>

      <h2 style={S.h2}>6. Processors and sub-processors</h2>
      <p style={S.p}>
        We use carefully selected service providers who process data on our instructions under data processing
        agreements where required by GDPR:
      </p>
      <ul style={S.ul}>
        <li style={S.li}><strong>Cloud infrastructure</strong> — hosting in the EU where practicable</li>
        <li style={S.li}><strong>Stripe</strong> — payment processing</li>
        <li style={S.li}><strong>Email provider</strong> — transactional email (e.g. login OTP, billing notices)</li>
        <li style={S.li}><strong>OpenAI</strong> (optional) — embeddings for semantic search when you configure an API key</li>
      </ul>
      <p style={S.p}>
        We share only the minimum data necessary for each service. Sub-processors are bound by contractual
        obligations consistent with GDPR. A detailed list is available on request at{' '}
        <a href="mailto:privacy@zizka.ai" style={S.a}>privacy@zizka.ai</a>.
      </p>

      <h2 style={S.h2}>7. International transfers</h2>
      <p style={S.p}>
        We prefer EU/EEA processing. Where data is transferred outside the EU/EEA (for example, to a sub-processor
        in the United States), we rely on appropriate safeguards such as the EU Standard Contractual Clauses (SCCs)
        and supplementary measures where required.
      </p>

      <h2 style={S.h2}>8. Your rights under GDPR</h2>
      <p style={S.p}>If you are in the EU/EEA (or where GDPR applies), you have the right to:</p>
      <ul style={S.ul}>
        <li style={S.li}><strong>Access</strong> — obtain a copy of your personal data</li>
        <li style={S.li}><strong>Rectification</strong> — correct inaccurate data</li>
        <li style={S.li}><strong>Erasure</strong> — request deletion (&quot;right to be forgotten&quot;), subject to legal retention</li>
        <li style={S.li}><strong>Restriction</strong> — limit processing in certain circumstances</li>
        <li style={S.li}><strong>Data portability</strong> — receive data in a structured, machine-readable format where applicable</li>
        <li style={S.li}><strong>Object</strong> — object to processing based on legitimate interests or direct marketing</li>
        <li style={S.li}><strong>Withdraw consent</strong> — where processing is based on consent, without affecting prior lawful processing</li>
      </ul>
      <p style={S.p}>
        To exercise these rights, email <a href="mailto:privacy@zizka.ai" style={S.a}>privacy@zizka.ai</a>.
        We respond within one month, extendable where permitted by law. You may also lodge a complaint with the
        Spanish supervisory authority:{' '}
        <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" style={S.a}>
          Agencia Española de Protección de Datos (AEPD)
        </a>.
      </p>
      <p style={S.p}>
        Managed cloud users can export or delete account-related data via dashboard settings where available,
        or by contacting us.
      </p>

      <h2 style={S.h2}>9. Cookies and similar technologies</h2>
      <p style={S.p}>We use cookies and local storage for:</p>
      <ul style={S.ul}>
        <li style={S.li}><strong>Strictly necessary</strong> — authentication, security, load balancing (no consent required)</li>
        <li style={S.li}><strong>Preferences</strong> — cookie consent choice stored locally</li>
        <li style={S.li}><strong>Analytics / improvement</strong> — only where you accept optional cookies via our banner</li>
      </ul>
      <p style={S.p}>
        You can accept or decline non-essential cookies via the site banner. Declining does not block access to
        the service. You may clear cookies in your browser at any time.
      </p>

      <h2 style={S.h2}>10. Retention</h2>
      <ul style={S.ul}>
        <li style={S.li}><strong>Account data</strong> — while your account is active, then deleted or anonymised within a reasonable period after closure (subject to legal holds)</li>
        <li style={S.li}><strong>Agent events</strong> — according to your plan and settings; see <Link href="/trust#integrity" style={S.a}>retention documentation</Link></li>
        <li style={S.li}><strong>Billing records</strong> — as required by tax and commercial law (typically up to 6–10 years in Spain)</li>
        <li style={S.li}><strong>Security logs</strong> — limited period for incident investigation (typically up to 90 days unless needed for legal claims)</li>
      </ul>

      <h2 style={S.h2}>11. Security</h2>
      <p style={S.p}>
        We implement appropriate technical and organisational measures including encryption in transit (TLS),
        access controls, tenant isolation, and regular backups for managed cloud. No method of transmission
        or storage is 100% secure; report suspected incidents to{' '}
        <a href="mailto:founder@zizka.ai?subject=Security%20incident" style={S.a}>founder@zizka.ai</a>.
        See also our <Link href="/trust#security" style={S.a}>security overview</Link>.
      </p>

      <h2 style={S.h2}>12. Children</h2>
      <p style={S.p}>
        ZizkaDB is a B2B developer product and is not directed at children under 16. We do not knowingly collect
        personal data from children. Contact us if you believe a child has provided data and we will delete it.
      </p>

      <h2 style={S.h2}>13. Changes to this policy</h2>
      <p style={S.p}>
        We may update this policy to reflect legal, technical, or business changes. We will post the revised
        version on this page with an updated date. Material changes affecting managed cloud customers may be
        communicated by email or in-dashboard notice where appropriate.
      </p>

      <h2 style={S.h2}>14. Other ZIZKA AI products</h2>
      <p style={S.p}>
        This policy covers ZizkaDB and db.zizka.ai. Other products from ZIZKA AI S.L. (for example{' '}
        <a href="https://zizka.ai/privacy" target="_blank" rel="noopener noreferrer" style={S.a}>
          zizka.ai
        </a>
        ) may have separate or supplementary privacy information.
      </p>

      <h2 style={S.h2}>15. Contact</h2>
      <p style={S.p}>
        Data protection enquiries: <a href="mailto:privacy@zizka.ai" style={S.a}>privacy@zizka.ai</a><br />
        General contact: <a href="mailto:founder@zizka.ai" style={S.a}>founder@zizka.ai</a><br />
        Enterprise: <Link href="/enterprise#contact" style={S.a}>contact form</Link>
      </p>
    </LegalDocumentLayout>
  )
}
