import { BRAND } from "@/components/brand";

export function MarketingPageStyles() {
  return (
    <style>{`
      .zdb-section-anchor {
        scroll-margin-top: 72px;
      }
      .zdb-marketing-root {
        overflow-x: clip;
        max-width: 100%;
      }
      .zdb-faq-summary::-webkit-details-marker {
        display: none;
      }
      .zdb-faq-summary:focus-visible {
        outline: 2px solid ${BRAND};
        outline-offset: -2px;
      }
      .zdb-connect-submit:focus-visible {
        outline: 2px solid ${BRAND};
        outline-offset: 2px;
      }
      .zdb-price-grid {
        align-items: stretch !important;
      }
      .zdb-pricing-card {
        height: 100%;
      }
      .zdb-pricing-card-footer a:hover {
        opacity: 0.92;
      }
      .zdb-pricing-card-footer a:focus-visible {
        outline: 2px solid ${BRAND};
        outline-offset: 2px;
      }
      .zdb-footer-grid a:hover {
        color: #fff !important;
      }
      .site-nav-menu-btn {
        display: none;
      }
      .site-nav-mobile-drawer {
        display: none;
      }
      .zdb-compare-mobile {
        display: none;
      }
      @media (max-width: 1024px) {
        .zdb-connect-grid { grid-template-columns: 1fr !important; }
        .zdb-feature-grid { grid-template-columns: repeat(2, 1fr) !important; }
        .zdb-price-grid { grid-template-columns: repeat(2, 1fr) !important; }
        .zdb-why-grid { grid-template-columns: repeat(2, 1fr) !important; }
        .zdb-split-3 { grid-template-columns: 1fr !important; }
        .zdb-section {
          padding-left: 24px !important;
          padding-right: 24px !important;
        }
        .zdb-trust-grid { grid-template-columns: repeat(2, 1fr) !important; }
      }
      @media (max-width: 768px) {
        .site-nav-links { display: none !important; }
        .site-nav-cta { display: none !important; }
        .site-nav-menu-btn { display: inline-flex !important; }
        .site-nav-mobile-drawer { display: block !important; }
        .zdb-section {
          padding-left: 20px !important;
          padding-right: 20px !important;
          padding-top: 48px !important;
          padding-bottom: 48px !important;
        }
        .zdb-hero-title {
          font-size: 32px !important;
          letter-spacing: -0.7px !important;
        }
        .zdb-hero-value { font-size: 16px !important; }
        .zdb-section-h2 {
          font-size: 26px !important;
          letter-spacing: -0.4px !important;
        }
        .zdb-final-cta-title { font-size: 28px !important; }
        .zdb-lead {
          font-size: 16px !important;
          margin-bottom: 32px !important;
        }
        .zdb-connect-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
        .zdb-compare-grid { grid-template-columns: 1fr !important; }
        .zdb-split { grid-template-columns: 1fr !important; }
        .zdb-split-3 { grid-template-columns: 1fr !important; }
        .zdb-why-grid { grid-template-columns: 1fr !important; }
        .zdb-price-grid { grid-template-columns: 1fr !important; }
        .zdb-tier-grid { grid-template-columns: 1fr !important; }
        .zdb-trust-grid { grid-template-columns: 1fr !important; }
        .zdb-feature-grid { grid-template-columns: 1fr !important; }
        .zdb-resource-grid { grid-template-columns: 1fr 1fr !important; }
        .zdb-hero-btns {
          flex-direction: column !important;
          align-items: stretch !important;
        }
        .zdb-hero-btns a, .zdb-hero-btns button {
          justify-content: center !important;
          width: 100%;
        }
        .zdb-cta-row {
          flex-direction: column !important;
          align-items: stretch !important;
        }
        .zdb-cta-row a, .zdb-cta-row button {
          justify-content: center !important;
          width: 100%;
        }
        .brand-logo-tagline { display: none !important; }
        .zdb-demo-activity-row {
          display: flex !important;
          flex-direction: column !important;
          align-items: flex-start !important;
          gap: 6px !important;
        }
        .zdb-demo-behavior-grid { grid-template-columns: 1fr !important; }
        .zdb-integration-pill {
          min-width: 0 !important;
          flex: 1 1 calc(50% - 5px) !important;
          max-width: calc(50% - 5px);
        }
        .zdb-compare-table-wrap { display: none !important; }
        .zdb-compare-mobile { display: flex !important; }
        .zdb-footer-grid {
          grid-template-columns: 1fr !important;
          gap: 32px !important;
          padding: 40px 20px 32px !important;
        }
        .zdb-footer-meta {
          flex-direction: column !important;
          padding: 16px 20px 24px !important;
        }
        .zdb-footer-meta span { text-align: left !important; }
        .zdb-feature-card { padding: 24px 20px !important; }
        .zdb-feature-card h3 { font-size: 18px !important; }
      }
      @media (max-width: 480px) {
        .zdb-section {
          padding-left: 16px !important;
          padding-right: 16px !important;
        }
        .zdb-hero-title {
          font-size: 28px !important;
          letter-spacing: -0.55px !important;
        }
        .zdb-section-h2 { font-size: 24px !important; }
        .zdb-final-cta-title { font-size: 26px !important; }
        .zdb-integration-pill {
          flex: 1 1 100% !important;
          max-width: 100% !important;
        }
        .zdb-resource-grid { grid-template-columns: 1fr !important; }
      }
      @media (max-width: 1024px) and (min-width: 769px) {
        .zdb-footer-grid { grid-template-columns: 1fr 1fr !important; }
      }
      @media (prefers-reduced-motion: reduce) {
        .site-nav-mobile-drawer { transition: none !important; }
      }
    `}</style>
  );
}
