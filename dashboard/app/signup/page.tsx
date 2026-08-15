"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { requestOtp, verifyOtp, createCheckoutSession } from "@/lib/api";
import {
  authErrorMessage,
  isAlreadyRegisteredError,
  isGdprConsentError,
} from "@/lib/auth-errors";
import { setToken } from "@/lib/auth";
import { OTP_LENGTH } from "@/lib/constants";
import { useResendCooldown } from "@/hooks/useResendCooldown";
import {
  clearSignupSession,
  getStoredSignupPlan,
  hasSignupConsent,
  SIGNUP_CONSENT_MARKETING_KEY,
  SIGNUP_PLAN_KEY,
} from "@/lib/signup-funnel";
import { BrandLogo } from "@/components/BrandLogo";
import {
  authPage,
  authCard,
  authTitle,
  authSubtitle,
  authLabel,
  authInput,
  authSubmitBtn,
  authLink,
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
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const verifyLock = useRef(false);
  const verifyFormRef = useRef<HTMLFormElement>(null);
  const { cooldown, canResend, startCooldown } = useResendCooldown();
  // Gate the form render until the guard confirms the user belongs on /signup.
  // Prevents the email screen from flashing before a redirect to /signup/plan
  // or /signup/start resolves. Monotonic: only ever set true.
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Always start from email step when entering /signup to avoid stale OTP view.
    setStep("email");
    setOtp("");
    setError("");
    setAlreadyRegistered(false);

    const planParam = searchParams.get("plan");
    if (planParam === "pro" || planParam === "team") {
      sessionStorage.setItem(SIGNUP_PLAN_KEY, planParam);
    }

    const stored = getStoredSignupPlan();
    if (!stored) {
      router.replace("/signup/plan");
      return;
    }

    if (!hasSignupConsent()) {
      router.replace(`/signup/start?plan=${stored}`);
      return;
    }

    setChecked(true);
  }, [searchParams, router]);

  useEffect(() => {
    if (
      step !== "otp" ||
      otp.length !== OTP_LENGTH ||
      loading ||
      navigating ||
      verifyLock.current
    )
      return;
    verifyFormRef.current?.requestSubmit();
  }, [otp, step, loading, navigating]);

  async function sendSignupOtp() {
    await requestOtp(email, "signup");
    setStep("otp");
    startCooldown();
  }

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setAlreadyRegistered(false);
    try {
      await sendSignupOtp();
    } catch (e) {
      setAlreadyRegistered(isAlreadyRegisteredError(e));
      setError(authErrorMessage(e, "Could not send code. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (!canResend || loading) return;
    setLoading(true);
    setError("");
    setAlreadyRegistered(false);
    try {
      await sendSignupOtp();
    } catch (e) {
      setAlreadyRegistered(isAlreadyRegisteredError(e));
      setError(authErrorMessage(e, "Failed to resend code. Try again."));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (verifyLock.current || navigating) return;
    verifyLock.current = true;
    setLoading(true);
    setError("");
    try {
      const gdprConsent = hasSignupConsent();
      const marketingConsent =
        sessionStorage.getItem(SIGNUP_CONSENT_MARKETING_KEY) === "1";
      if (!gdprConsent) {
        verifyLock.current = false;
        setLoading(false);
        const plan = getStoredSignupPlan() ?? "pro";
        router.replace(`/signup/start?plan=${plan}`);
        return;
      }
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
        try {
          const session = await createCheckoutSession(data.access_token, plan);
          window.location.assign(session.url);
          return;
        } catch {
          // Checkout couldn't be started right now -- don't strand the user
          // on a broken screen. Land on the dashboard instead; its
          // requires_checkout-driven resume-onboarding screen offers to
          // retry checkout.
        }
      }
      window.location.assign("/dashboard");
    } catch (e) {
      verifyLock.current = false;
      if (isGdprConsentError(e)) {
        setLoading(false);
        const plan = getStoredSignupPlan() ?? "pro";
        router.replace(`/signup/start?plan=${plan}`);
        return;
      }
      setAlreadyRegistered(isAlreadyRegisteredError(e));
      setError(authErrorMessage(e, "Invalid or expired code."));
      setLoading(false);
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
        <p style={{ fontSize: 15 }}>Creating your account… taking you to secure checkout next.</p>
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

        {/* Card */}
        <div style={authCard}>
          {step === "email" ? (
            <>
              <h1 style={authTitle}>Create your account</h1>
              <p style={authSubtitle}>
                Enter your email. We send a 6-digit code — no password needed.
              </p>
              <form
                onSubmit={handleRequestOtp}
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <div>
                  <label style={authLabel}>Work email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    autoFocus
                    style={authInput}
                    onFocus={(e) => (e.target.style.borderColor = M.brandLight)}
                    onBlur={(e) => (e.target.style.borderColor = M.lineStrong)}
                  />
                </div>
                {error && (
                  <p style={{ fontSize: 13, color: M.danger, margin: 0 }}>
                    {error}
                    {alreadyRegistered && (
                      <>
                        {" "}
                        <Link
                          href={`/login?email=${encodeURIComponent(email)}`}
                          style={{ color: M.brandLight, fontWeight: 600 }}
                        >
                          Sign in →
                        </Link>
                      </>
                    )}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading || !email}
                  style={{
                    ...authSubmitBtn,
                    opacity: loading || !email ? 0.4 : 1,
                  }}
                >
                  {loading ? "Sending..." : "Send verification code →"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 style={authTitle}>Verify your email</h1>
              <p style={authSubtitle}>
                We sent a 6-digit code to{" "}
                <strong style={{ color: M.ink }}>{email}</strong>
              </p>
              <form
                ref={verifyFormRef}
                onSubmit={handleVerifyOtp}
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <div>
                  <label style={authLabel}>Verification code</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) =>
                      setOtp(
                        e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH),
                      )
                    }
                    placeholder="000000"
                    required
                    autoFocus
                    maxLength={OTP_LENGTH}
                    disabled={loading}
                    style={{
                      ...authInput,
                      padding: "12px",
                      fontSize: 28,
                      textAlign: "center",
                      letterSpacing: "0.4em",
                      fontFamily: "monospace",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = M.brandLight)}
                    onBlur={(e) => (e.target.style.borderColor = M.lineStrong)}
                  />
                </div>
                {error && (
                  <p style={{ fontSize: 13, color: M.danger, margin: 0 }}>
                    {error}
                    {alreadyRegistered && (
                      <>
                        {" "}
                        <Link
                          href={`/login?email=${encodeURIComponent(email)}`}
                          style={{ color: M.brandLight, fontWeight: 600 }}
                        >
                          Sign in →
                        </Link>
                      </>
                    )}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading || otp.length < OTP_LENGTH}
                  style={{
                    ...authSubmitBtn,
                    opacity: loading || otp.length < OTP_LENGTH ? 0.4 : 1,
                  }}
                >
                  {loading ? "Verifying..." : "Create account →"}
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={!canResend || loading}
                  style={{
                    fontSize: 13,
                    color: canResend ? M.muted : M.faint,
                    background: "none",
                    border: "none",
                    cursor: canResend && !loading ? "pointer" : "not-allowed",
                  }}
                >
                  {canResend ? "Resend code" : `Resend code in ${cooldown}s`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    verifyLock.current = false;
                    setStep("email");
                    setOtp("");
                    setError("");
                    setAlreadyRegistered(false);
                  }}
                  style={{
                    fontSize: 13,
                    color: M.faint,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  ← Use a different email
                </button>
              </form>
            </>
          )}
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
