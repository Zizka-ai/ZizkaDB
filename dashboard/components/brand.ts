/** Brand colors */
export const BRAND = "#f97316";
export const BRAND_DARK = "#ea580c";
export const BRAND_LIGHT = "#fdba74";
export const BRAND_PALE = "#fed7aa";
export const BRAND_MUTED = "#9a3412";
export const BRAND_SHADOW_TINT = "rgba(249,115,22,0.1)";

export const brandLogoStyle = {
  width: 28,
  height: 28,
  borderRadius: 7,
  background: BRAND,
  display: "flex" as const,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

export const brandCtaStyle = {
  fontSize: 14,
  fontWeight: 600,
  color: "#fff",
  textDecoration: "none",
  padding: "8px 18px",
  background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%)`,
  borderRadius: 8,
  boxShadow: "0 2px 12px rgba(249,115,22,0.35)",
};
