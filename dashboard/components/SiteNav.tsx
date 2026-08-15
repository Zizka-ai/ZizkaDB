"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { BrandLogo } from "./BrandLogo";
import {
  BRAND,
  BRAND_DARK,
  BRAND_LIGHT,
  brandCtaStyle,
  enterpriseNavLinkStyle,
} from "./brand";

export type SiteNavActive =
  | "docs"
  | "community"
  | "trust"
  | "explorer"
  | "home"
  | "enterprise";

type SiteNavProps = {
  active?: SiteNavActive;
  /** e.g. "Docs" shows as "ZizkaDB / Docs" */
  suffix?: string;
};

const linkStyle = (on: boolean): CSSProperties => ({
  fontSize: 14,
  color: on ? "#fff" : "#ffffff",
  fontWeight: on ? 600 : 400,
  textDecoration: "none",
});

const mobileLinkStyle = (on: boolean): CSSProperties => ({
  display: "block",
  padding: "14px 0",
  fontSize: 16,
  fontWeight: on ? 600 : 500,
  color: on ? "#fff" : "#ffffff",
  textDecoration: "none",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
});

export function SiteNav({ active, suffix }: SiteNavProps) {
  const enterpriseActive = active === "enterprise";
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <style>{`
        .site-nav-enterprise:not([data-active="true"]):hover {
          border-color: ${BRAND_LIGHT} !important;
          box-shadow: 0 2px 12px rgba(249,115,22,0.18) !important;
          color: ${BRAND_DARK} !important;
        }
        .site-nav-enterprise:focus-visible {
          outline: 2px solid ${BRAND};
          outline-offset: 2px;
        }
        .site-nav-menu-btn {
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          padding: 0;
          border: 1px solid rgba(255,255,255,0.16);
          border-radius: 10px;
          background: rgba(255,255,255,0.06);
          color: #fff;
          cursor: pointer;
        }
        .site-nav-menu-btn:focus-visible {
          outline: 2px solid ${BRAND};
          outline-offset: 2px;
        }
        .site-nav-mobile-backdrop {
          position: fixed;
          inset: 0;
          top: 56px;
          background: rgba(0,0,0,0.55);
          z-index: 98;
        }
        .site-nav-mobile-panel {
          position: fixed;
          top: 56px;
          left: 0;
          right: 0;
          max-height: calc(100dvh - 56px);
          overflow-y: auto;
          background: rgba(6,6,16,0.98);
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding: 8px 20px 24px;
          padding-bottom: calc(24px + env(safe-area-inset-bottom));
          z-index: 99;
        }
      `}</style>
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 max(16px, env(safe-area-inset-left)) 0 max(16px, env(safe-area-inset-right))",
          height: 56,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          position: "sticky",
          top: 0,
          background: "rgba(6,6,16,0.92)",
          backdropFilter: "blur(10px)",
          zIndex: 100,
          gap: 12,
          minWidth: 0,
        }}
      >
        <div style={{ minWidth: 0, flexShrink: 1 }}>
          <BrandLogo suffix={suffix} />
        </div>

        <div
          className="site-nav-links"
          style={{ display: "flex", alignItems: "center", gap: 20, flexShrink: 0 }}
        >
          <Link href="/docs" style={linkStyle(active === "docs")}>
            Docs
          </Link>
          <Link href="/community" style={linkStyle(active === "community")}>
            Community
          </Link>
          <a href="/swagger" style={linkStyle(active === "explorer")}>
            API Explorer
          </a>
          <Link
            href="/enterprise"
            className="site-nav-enterprise"
            data-active={enterpriseActive ? "true" : "false"}
            style={enterpriseNavLinkStyle(enterpriseActive)}
          >
            Enterprise
          </Link>
          <Link
            href="/login"
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "rgba(255,255,255,0.85)",
              textDecoration: "none",
              padding: "7px 16px",
              border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 8,
            }}
          >
            Sign in
          </Link>
          <Link href="/signup" style={brandCtaStyle}>
            Get started
          </Link>
        </div>

        <button
          type="button"
          className="site-nav-menu-btn"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </nav>

      {menuOpen && (
        <div className="site-nav-mobile-drawer">
          <button
            type="button"
            className="site-nav-mobile-backdrop"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="site-nav-mobile-panel" role="dialog" aria-modal="true" aria-label="Navigation">
            <Link href="/docs" style={mobileLinkStyle(active === "docs")} onClick={() => setMenuOpen(false)}>
              Docs
            </Link>
            <Link href="/community" style={mobileLinkStyle(active === "community")} onClick={() => setMenuOpen(false)}>
              Community
            </Link>
            <a href="/swagger" style={mobileLinkStyle(active === "explorer")} onClick={() => setMenuOpen(false)}>
              API Explorer
            </a>
            <Link
              href="/enterprise"
              style={mobileLinkStyle(enterpriseActive)}
              onClick={() => setMenuOpen(false)}
            >
              Enterprise
            </Link>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "12px 16px",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.9)",
                  textDecoration: "none",
                  border: "1px solid rgba(255,255,255,0.16)",
                  borderRadius: 10,
                }}
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                onClick={() => setMenuOpen(false)}
                style={{ ...brandCtaStyle, justifyContent: "center", width: "100%" }}
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
