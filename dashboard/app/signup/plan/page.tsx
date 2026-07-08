"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { BRAND } from "@/components/brand";
import { SIGNUP_PLAN_KEY } from "@/lib/signup-funnel";

const PLANS = [
  {
    id: "pro" as const,
    name: "Pro",
    price: "€29",
    price_sub: "/ month",
    highlight: true,
    features: [
      "50k events / month",
      "2 projects",
      "3 active API keys",
      "30-day free trial",
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
      "5 projects",
      "10 active API keys",
      "30-day free trial",
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
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fafafa",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: "24px 16px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 720 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <BrandLogo variant="full" suffix="Choose your plan" />
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "28px 24px",
            border: "1px solid #e5e5e5",
            boxShadow: "0 2px 20px rgba(0,0,0,0.05)",
          }}
        >
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#111",
              margin: "0 0 8px",
              textAlign: "center",
            }}
          >
            Select a package
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#666",
              margin: "0 0 24px",
              lineHeight: 1.6,
              textAlign: "center",
            }}
          >
            30-day free trial on every plan. No credit card required.
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
                        ? `2px solid ${BRAND}33`
                        : "1px solid #e5e5e5",
                    background: isSelected ? "#fff7ed" : "#fff",
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
                      color: "#111",
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
                      style={{ fontSize: 28, fontWeight: 700, color: "#111" }}
                    >
                      {plan.price}
                    </span>
                    <span
                      style={{ fontSize: 13, fontWeight: 600, color: "#666" }}
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
                          color: "#333",
                          display: "flex",
                          gap: 8,
                        }}
                      >
                        <span style={{ color: "#111", fontWeight: 800 }}>
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
              width: "100%",
              marginTop: 24,
              padding: "12px",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: "#111",
              color: "#fff",
            }}
          >
            Start free trial →
          </button>
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: 13,
            color: "#aaa",
            marginTop: 20,
          }}
        >
          Not sure yet?{" "}
          <a
            href="https://db.zizka.ai/docs"
            style={{ color: "#555", textDecoration: "none" }}
          >
            Explore docs and other options →
          </a>
        </p>
      </div>
    </div>
  );
}
