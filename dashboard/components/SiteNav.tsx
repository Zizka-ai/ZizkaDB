import Link from "next/link";
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
  color: "#000",
  fontWeight: on ? 600 : 400,
  textDecoration: "none",
});

export function SiteNav({ active, suffix }: SiteNavProps) {
  const enterpriseActive = active === "enterprise";

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
      `}</style>
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          height: 56,
          borderBottom: "1px solid #f0f0f0",
          position: "sticky",
          top: 0,
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(8px)",
          zIndex: 100,
        }}
      >
        <BrandLogo suffix={suffix} />

        <div
          className="site-nav-links"
          style={{ display: "flex", alignItems: "center", gap: 20 }}
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
              color: "#000",
              textDecoration: "none",
              padding: "7px 16px",
              border: "1px solid #ddd",
              borderRadius: 8,
            }}
          >
            Sign in
          </Link>
          <Link href="/signup" style={brandCtaStyle}>
            Start free →
          </Link>
        </div>

        <div
          className="site-nav-cta"
          style={{ display: "none", alignItems: "center", gap: 8 }}
        >
          <Link
            href="/enterprise"
            className="site-nav-enterprise"
            data-active={enterpriseActive ? "true" : "false"}
            style={{
              ...enterpriseNavLinkStyle(enterpriseActive),
              fontSize: 12,
              padding: "6px 10px",
            }}
          >
            Enterprise
          </Link>
          <Link
            href="/login"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#111",
              textDecoration: "none",
              padding: "6px 12px",
              border: "1px solid #ddd",
              borderRadius: 8,
            }}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            style={{ ...brandCtaStyle, fontSize: 13, padding: "6px 14px" }}
          >
            Start free →
          </Link>
        </div>
      </nav>
    </>
  );
}
