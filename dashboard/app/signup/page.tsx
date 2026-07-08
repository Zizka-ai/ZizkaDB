"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { requestOtp, verifyOtp, selectBillingPlan } from "@/lib/api";
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
        background: "#fafafa",
        fontFamily: "Inter, system-ui, sans-serif",
        color: "#888",
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
      if (plan === "pro" || plan === "team") {
        try {
          await selectBillingPlan(data.access_token, plan);
        } catch {
          /* non-fatal */
        }
      }
      setNavigating(true);
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
          background: "#fafafa",
          fontFamily: "Inter, system-ui, sans-serif",
          color: "#555",
        }}
      >
        <p style={{ fontSize: 15 }}>Creating your account…</p>
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
        background: "#fafafa",
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
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "36px 32px",
            border: "1px solid #e5e5e5",
            boxShadow: "0 2px 20px rgba(0,0,0,0.05)",
          }}
        >
          {step === "email" ? (
            <>
              <h1
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#111",
                  marginBottom: 6,
                }}
              >
                Create your account
              </h1>
              <p
                style={{
                  fontSize: 14,
                  color: "#888",
                  marginBottom: 24,
                  lineHeight: 1.6,
                }}
              >
                Enter your email. We send a 6-digit code — no password needed.
              </p>
              <form
                onSubmit={handleRequestOtp}
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#555",
                      marginBottom: 6,
                    }}
                  >
                    Work email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    autoFocus
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 14px",
                      borderRadius: 9,
                      fontSize: 14,
                      border: "1px solid #ddd",
                      outline: "none",
                      color: "#111",
                      background: "#fafafa",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#111")}
                    onBlur={(e) => (e.target.style.borderColor = "#ddd")}
                  />
                </div>
                {error && (
                  <p style={{ fontSize: 13, color: "#ef4444", margin: 0 }}>
                    {error}
                    {alreadyRegistered && (
                      <>
                        {" "}
                        <Link
                          href={`/login?email=${encodeURIComponent(email)}`}
                          style={{ color: "#111", fontWeight: 600 }}
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
                    padding: "11px",
                    borderRadius: 9,
                    fontSize: 14,
                    fontWeight: 500,
                    background: "#111",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    opacity: loading || !email ? 0.4 : 1,
                  }}
                >
                  {loading ? "Sending..." : "Send verification code →"}
                </button>
                <p
                  style={{
                    fontSize: 12,
                    color: "#bbb",
                    textAlign: "center",
                    margin: 0,
                  }}
                >
                  Free to start · No credit card required
                </p>
              </form>
            </>
          ) : (
            <>
              <h1
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#111",
                  marginBottom: 6,
                }}
              >
                Verify your email
              </h1>
              <p
                style={{
                  fontSize: 14,
                  color: "#888",
                  marginBottom: 24,
                  lineHeight: 1.6,
                }}
              >
                We sent a 6-digit code to{" "}
                <strong style={{ color: "#111" }}>{email}</strong>
              </p>
              <form
                ref={verifyFormRef}
                onSubmit={handleVerifyOtp}
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#555",
                      marginBottom: 6,
                    }}
                  >
                    Verification code
                  </label>
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
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "12px",
                      borderRadius: 9,
                      fontSize: 28,
                      border: "1px solid #ddd",
                      outline: "none",
                      color: "#111",
                      background: "#fafafa",
                      textAlign: "center",
                      letterSpacing: "0.4em",
                      fontFamily: "monospace",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#111")}
                    onBlur={(e) => (e.target.style.borderColor = "#ddd")}
                  />
                </div>
                {error && (
                  <p style={{ fontSize: 13, color: "#ef4444", margin: 0 }}>
                    {error}
                    {alreadyRegistered && (
                      <>
                        {" "}
                        <Link
                          href={`/login?email=${encodeURIComponent(email)}`}
                          style={{ color: "#111", fontWeight: 600 }}
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
                    padding: "11px",
                    borderRadius: 9,
                    fontSize: 14,
                    fontWeight: 500,
                    background: "#111",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
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
                    color: canResend ? "#555" : "#bbb",
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
                    color: "#888",
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
            color: "#aaa",
            marginTop: 20,
          }}
        >
          Already have an account?{" "}
          <Link
            href="/login"
            style={{ color: "#555", textDecoration: "none", fontWeight: 500 }}
          >
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  );
}
