"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyOtp, selectBillingPlan } from "@/lib/api";
import { isGdprConsentError } from "@/lib/auth-errors";
import { setToken } from "@/lib/auth";
import { useSignupFunnelGuard } from "@/hooks/useSignupFunnelGuard";
import {
  clearSignupSession,
  getStoredSignupPlan,
  hasSignupConsent,
  SIGNUP_CONSENT_MARKETING_KEY,
} from "@/lib/signup-funnel";
import { BrandLogo } from "@/components/BrandLogo";
import { OtpForm } from "@/components/auth/OtpForm";
import {
  authCard,
  authMutedLink,
} from "@/components/marketing/auth-styles";
import { M } from "@/components/marketing/marketing-theme";

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupFallback />}>
      <SignupForm />
    </Suspense>
  );
}

function SignupFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: M.bg,
        fontFamily: "Inter, system-ui, sans-serif",
        color: M.faint,
      }}
    >
      Loading…
    </div>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [navigating, setNavigating] = useState(false);
  const { ready: checked } = useSignupFunnelGuard("otp");

  async function handleVerified({
    email,
    otp,
  }: {
    email: string;
    otp: string;
  }) {
    const gdprConsent = hasSignupConsent();
    const marketingConsent =
      sessionStorage.getItem(SIGNUP_CONSENT_MARKETING_KEY) === "1";
    if (!gdprConsent) {
      const plan = getStoredSignupPlan() ?? "pro";
      router.replace(`/signup/start?plan=${plan}`);
      return "aborted";
    }
    try {
      const data = await verifyOtp(email, otp, {
        intent: "signup",
        gdprConsent,
        marketingConsent,
      });
      const plan = getStoredSignupPlan();
      setToken(data.access_token);
      clearSignupSession();
      setNavigating(true);
      if (plan === "pro" || plan === "team") {
        await selectBillingPlan(data.access_token, plan);
      }
      window.location.assign("/dashboard");
    } catch (e) {
      if (isGdprConsentError(e)) {
        const plan = getStoredSignupPlan() ?? "pro";
        router.replace(`/signup/start?plan=${plan}`);
        return "aborted";
      }
      throw e;
    }
  }

  if (navigating) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: M.bg,
          fontFamily: "Inter, system-ui, sans-serif",
          color: M.muted,
        }}
      >
        <p style={{ fontSize: 15 }}>Creating your account… opening your dashboard.</p>
      </div>
    );
  }

  // Hold the neutral loader until the guard resolves, so the email/OTP form
  // never paints before a pending redirect (fixes the signup screen flicker).
  if (!checked) return <SignupFallback />;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: M.bg,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420, padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <BrandLogo
            variant="full"
            suffix="The operational database for AI agents"
          />
        </div>

        <div style={authCard}>
          <OtpForm
            key={searchParams.toString()}
            intent="signup"
            onVerified={handleVerified}
          />
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: 13,
            color: M.muted,
            marginTop: 20,
          }}
        >
          Already have an account?{" "}
          <Link href="/login" style={authMutedLink}>
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  );
}
