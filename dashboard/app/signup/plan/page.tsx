"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { BRAND, BRAND_DARK } from "@/components/brand";
import { SIGNUP_PLAN_KEY } from "@/lib/signup-funnel";
import { M } from "@/components/marketing/marketing-theme";
import { authPage, authSubtitle, authTitle, authMutedLink, authSubmitBtn, authCard } from "@/components/marketing/auth-styles";

const PLANS = [
  {
    id: "pro" as const,
    name: "Pro",
    price: "€29",
    price_sub: "/ month",
    highlight: true,
    features: [
      "50k events / month",
      "3 active API keys",
      "Email support",
    ],
  },
  {
    id: "team" as const,
    name: "Team",
    price: "€69",
    price_sub: "/ month",
    highlight: false,
    features: [
      "100k events / month",
      "10 active API keys",
      "Priority support",
    ],
  },
];

export default function SignupPlanPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<"pro" | "team">("pro");

  function handleContinue() {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SIGNUP_PLAN_KEY, selected);
    }
    router.push(`/signup/start?plan=${selected}`);
  }

  return (
    <div
      style={{
        ...authPage,
        padding: "24px 16px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 720 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <BrandLogo variant="full" suffix="Choose your plan" />
        </div>

        <div style={authCard}>
          <h1 style={{ ...authTitle, textAlign: "center", margin: "0 0 8px" }}>
            Select a package
          </h1>
          <p style={{ ...authSubtitle, textAlign: "center", margin: "0 0 8px" }}>
            Pick the plan that fits your team. You can change it later.
          </p>
          <p
            style={{
              textAlign: "center",
              margin: "0 0 24px",
              fontSize: 13,
              fontWeight: 600,
              color: M.brandLight,
            }}
          >
            1 month free trial · No charge today · Card required · Cancel anytime
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            {PLANS.map((plan) => {
              const isSelected = selected === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelected(plan.id)}
                  style={{
                    textAlign: "left",
                    cursor: "pointer",
                    borderRadius: 14,
                    padding: "22px 20px",
                    border: isSelected
                      ? `2px solid ${BRAND}`
                      : plan.highlight
                        ? `2px solid ${BRAND}44`
                        : `1px solid ${M.line}`,
                    background: isSelected ? "rgba(249,115,22,0.12)" : M.bgElevated,
                    boxShadow: isSelected
                      ? "0 8px 24px rgba(249,115,22,0.12)"
                      : "none",
                    position: "relative",
                  }}
                >
                  {plan.highlight && (
                    <span
                      style={{
                        position: "absolute",
                        top: -10,
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: BRAND,
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "3px 10px",
                        borderRadius: 100,
                      }}
                    >
                      POPULAR
                    </span>
                  )}
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: M.inkSoft,
                      marginBottom: 8,
                    }}
                  >
                    {plan.name}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 4,
                      marginBottom: 14,
                    }}
                  >
                    <span
                      style={{ fontSize: 28, fontWeight: 700, color: M.ink }}
                    >
                      {plan.price}
                    </span>
                    <span
                      style={{ fontSize: 13, fontWeight: 600, color: M.muted }}
                    >
                      {plan.price_sub}
                    </span>
                  </div>
                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 7,
                    }}
                  >
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        style={{
                          fontSize: 13,
                          color: M.muted,
                          display: "flex",
                          gap: 8,
                        }}
                      >
                        <span style={{ color: M.brandLight, fontWeight: 800 }}>
                          ✓
                        </span>{" "}
                        {f}
                      </li>
                    ))}
                  </ul>
                  {isSelected && (
                    <p
                      style={{
                        margin: "14px 0 0",
                        fontSize: 12,
                        fontWeight: 700,
                        color: BRAND,
                      }}
                    >
                      Selected
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleContinue}
            style={{
              ...authSubmitBtn,
              width: "100%",
              marginTop: 24,
            }}
          >
            Continue →
          </button>
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: 13,
            color: M.faint,
            marginTop: 20,
          }}
        >
          Not sure yet?{" "}
          <a
            href="https://db.zizka.ai/docs"
            style={authMutedLink}
          >
            Explore docs and other options →
          </a>
        </p>
      </div>
    </div>
  );
}
