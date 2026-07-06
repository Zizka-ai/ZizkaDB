export function MarketingPageStyles() {
  return (
    <style>{`
      .zdb-section-anchor {
        scroll-margin-top: 72px;
      }
      .zdb-faq-summary::-webkit-details-marker {
        display: none;
      }
      .zdb-faq-summary:focus-visible {
        outline: 2px solid #f97316;
        outline-offset: -2px;
      }
      .zdb-connect-submit:focus-visible {
        outline: 2px solid #f97316;
        outline-offset: 2px;
      }
      @media (max-width: 1024px) {
        .zdb-connect-grid { grid-template-columns: 1fr !important; }
        .zdb-feature-grid { grid-template-columns: repeat(2, 1fr) !important; }
        .zdb-price-grid { grid-template-columns: repeat(2, 1fr) !important; }
      }
      @media (max-width: 768px) {
        .site-nav-links { display: none !important; }
        .site-nav-cta { display: flex !important; }
        .zdb-section { padding-left: 20px !important; padding-right: 20px !important; }
        .zdb-hero-title { font-size: 32px !important; }
        .zdb-hero-value { font-size: 16px !important; }
        .zdb-connect-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
        .zdb-section { padding-top: 48px !important; padding-bottom: 48px !important; }
        .zdb-compare-grid { grid-template-columns: 1fr !important; }
        .zdb-split { grid-template-columns: 1fr !important; }
        .zdb-price-grid { grid-template-columns: 1fr !important; }
        .zdb-tier-grid { grid-template-columns: 1fr !important; }
        .zdb-trust-grid { grid-template-columns: 1fr 1fr !important; }
        .zdb-feature-grid { grid-template-columns: 1fr !important; }
        .zdb-resource-grid { grid-template-columns: 1fr 1fr !important; }
        .zdb-hero-btns { flex-direction: column !important; align-items: stretch !important; }
        .zdb-hero-btns a, .zdb-hero-btns button { justify-content: center !important; }
        .zdb-footer { flex-direction: column !important; gap: 16px !important; align-items: flex-start !important; }
        .zdb-footer-links { flex-wrap: wrap !important; gap: 16px !important; }
      }
    `}</style>
  )
}
