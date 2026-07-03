'use client'

import { useCallback, useState } from 'react'
import { SiteNav } from '@/components/SiteNav'
import { CalendlyBookModal } from '@/components/marketing/CalendlyBookModal'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'
import { MarketingPageStyles } from '@/components/marketing/MarketingPageStyles'
import { EnterpriseHeroSection } from './EnterpriseHeroSection'
import { EnterpriseWhatIsSection } from './EnterpriseWhatIsSection'
import { EnterpriseFleetSection } from './EnterpriseFleetSection'
import { EnterpriseCapabilitiesSection } from './EnterpriseCapabilitiesSection'
import { EnterpriseTierCompareSection } from './EnterpriseTierCompareSection'
import { EnterpriseVpcDeploySection } from './EnterpriseVpcDeploySection'
import { EnterprisePlatformFeaturesSection } from './EnterprisePlatformFeaturesSection'
import { EnterpriseFaqSection } from './EnterpriseFaqSection'
import { EnterpriseFooterCtaSection } from './EnterpriseFooterCtaSection'
import { EnterpriseResourcesStrip } from './EnterpriseResourcesStrip'
import { M } from '../marketing-theme'

export function EnterprisePageClient() {
  const [demoOpen, setDemoOpen] = useState(false)

  const scrollToConnect = useCallback(() => {
    document.getElementById('connect')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => {
      document.getElementById('ent-first')?.focus()
    }, 400)
  }, [])

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: M.ink, background: '#fff', minHeight: '100vh' }}>
      <MarketingPageStyles />
      <SiteNav active="enterprise" suffix="Enterprise" />

      <main>
        <EnterpriseHeroSection onConnectClick={scrollToConnect} onBookDemo={() => setDemoOpen(true)} />
        <EnterpriseWhatIsSection />
        <EnterpriseFleetSection />
        <EnterpriseCapabilitiesSection />
        <EnterpriseTierCompareSection onConnectClick={scrollToConnect} />
        <EnterpriseVpcDeploySection />
        <EnterprisePlatformFeaturesSection />
        <EnterpriseFaqSection />
        <EnterpriseFooterCtaSection onBookDemo={() => setDemoOpen(true)} />
        <EnterpriseResourcesStrip />
      </main>

      <CalendlyBookModal open={demoOpen} onClose={() => setDemoOpen(false)} />
      <MarketingFooter />
    </div>
  )
}
