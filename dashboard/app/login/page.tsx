"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { requestOtp, verifyOtp, devLogin } from "@/lib/api";
import { authErrorMessage, isNoAccountError } from "@/lib/auth-errors";
import { getToken, setToken } from "@/lib/auth";
import { OTP_LENGTH, IS_DEV_MODE } from "@/lib/constants";
import { useResendCooldown } from "@/hooks/useResendCooldown";
import { BrandLogo } from "@/components/BrandLogo";

function completeAuthRedirect(path: string) {
  window.location.assign(path);
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginFallback() {
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

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [error, setError] = useState("");
  const [noAccount, setNoAccount] = useState(false);
  const verifyLock = useRef(false);
  const verifyFormRef = useRef<HTMLFormElement>(null);
  const { cooldown, canResend, startCooldown } = useResendCooldown();

  const accountDeleted = searchParams.get("deleted") === "1";
  const emailPrefill = searchParams.get("email");
  const nextPath = searchParams.get("next");
  const safeNext =
    nextPath && nextPath.startsWith("/dashboard") && !nextPath.startsWith("//")
      ? nextPath
      : "/dashboard";

  useEffect(() => {
    if (emailPrefill) {
      setEmail(emailPrefill);
    }
  }, [emailPrefill]);

  useEffect(() => {
    const existing = getToken();
    if (existing) {
      setToken(existing);
      window.location.assign(safeNext);
    }
  }, [safeNext]);

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

  async function sendLoginOtp() {
    await requestOtp(email, "login");
    setStep("otp");
    startCooldown();
  }

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNoAccount(false);
    try {
      await sendLoginOtp();
    } catch (err) {
      setNoAccount(isNoAccountError(err));
      setError(authErrorMessage(err, "Failed to send code. Try again."));
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (!canResend || loading) return;
    setLoading(true);
    setError("");
    setNoAccount(false);
    try {
      await sendLoginOtp();
    } catch (err) {
      setNoAccount(isNoAccountError(err));
      setError(authErrorMessage(err, "Failed to resend code. Try again."));
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
    setNoAccount(false);
    try {
      const data = await verifyOtp(email, otp, { intent: "login" });
      setToken(data.access_token);
      setNavigating(true);
      completeAuthRedirect(safeNext);
    } catch (err) {
      verifyLock.current = false;
      setNoAccount(isNoAccountError(err));
      setError(authErrorMessage(err, "Invalid or expired code."));
      setLoading(false);
    }
  }

  async function handleDevLogin() {
    setDevLoading(true);
    setError("");
    try {
      const data = await devLogin();
      setToken(data.access_token);
      setNavigating(true);
      window.location.assign(safeNext);
    } catch {
      setError(
        "Could not connect to ZizkaDB API. Is docker-compose running on port 8000?",
      );
    } finally {
      setDevLoading(false);
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
        <p style={{ fontSize: 15 }}>Signing you in…</p>
      </div>
    );
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
      }}
    >
      <div style={{ width: "100%", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <BrandLogo
            variant="full"
            suffix="The operational database for AI agents"
          />
        </div>

        {accountDeleted && (
          <div
            style={{
              background: "#fef3c7",
              border: "1px solid #fcd34d",
              borderRadius: 12,
              padding: "14px 16px",
              marginBottom: 16,
              fontSize: 13,
              color: "#92400e",
              lineHeight: 1.55,
            }}
          >
            Your account was deleted.{" "}
            <Link
              href="https://db.zizka.ai/signup"
              style={{ color: "#111", fontWeight: 600 }}
            >
              Create a new account →
            </Link>
          </div>
        )}

        {IS_DEV_MODE && (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 12,
              padding: "16px 20px",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  background: "#22c55e",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: 99,
                  letterSpacing: "0.05em",
                }}
              >
                SELF-HOSTED
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#15803d" }}>
                Local dev mode
              </span>
            </div>
            <p style={{ fontSize: 13, color: "#166534", margin: "0 0 12px" }}>
              Running your own ZizkaDB instance? Open the dashboard directly —
              no account needed.
            </p>
            <button
              onClick={handleDevLogin}
              disabled={devLoading}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 9,
                fontSize: 14,
                fontWeight: 600,
                background: "#16a34a",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                opacity: devLoading ? 0.6 : 1,
              }}
            >
              {devLoading ? "Connecting..." : "Open my dashboard →"}
            </button>
          </div>
        )}

        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "36px 32px",
            border: "1px solid #e5e5e5",
            boxShadow: "0 2px 20px rgba(0,0,0,0.05)",
          }}
        >
          {IS_DEV_MODE && (
            <p
              style={{
                fontSize: 12,
                color: "#aaa",
                marginTop: 0,
                marginBottom: 20,
                textAlign: "center",
              }}
            >
              Or sign in with managed service account
            </p>
          )}

          {step === "email" ? (
            <>
              {!IS_DEV_MODE && (
                <h1
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: "#111",
                    marginBottom: 6,
                  }}
                >
                  Sign in
                </h1>
              )}
              {!IS_DEV_MODE && (
                <p style={{ fontSize: 14, color: "#888", marginBottom: 24 }}>
                  Enter your email and we&apos;ll send a 6-digit login code.
                </p>
              )}
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
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    autoFocus={!IS_DEV_MODE}
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
                  <div style={{ fontSize: 13, color: "#ef4444" }}>
                    <p style={{ margin: 0 }}>{error}</p>
                    {noAccount && (
                      <Link
                        href="https://db.zizka.ai/signup"
                        style={{
                          display: "inline-block",
                          marginTop: 10,
                          padding: "8px 14px",
                          borderRadius: 8,
                          background: "#111",
                          color: "#fff",
                          fontWeight: 600,
                          textDecoration: "none",
                          fontSize: 13,
                        }}
                      >
                        Create account
                      </Link>
                    )}
                  </div>
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
                  {loading ? "Sending..." : "Send code →"}
                </button>
                <p style={{ fontSize: 12, color: "#bbb", textAlign: "center" }}>
                  We send a 6-digit code to your email. No password needed.
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
                Check your email
              </h1>
              <p style={{ fontSize: 14, color: "#888", marginBottom: 24 }}>
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
                    Login code
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
                      fontSize: 24,
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
                  <div style={{ fontSize: 13, color: "#ef4444" }}>
                    <p style={{ margin: 0 }}>{error}</p>
                    {noAccount && (
                      <Link
                        href="https://db.zizka.ai/signup"
                        style={{
                          display: "inline-block",
                          marginTop: 10,
                          padding: "8px 14px",
                          borderRadius: 8,
                          background: "#111",
                          color: "#fff",
                          fontWeight: 600,
                          textDecoration: "none",
                          fontSize: 13,
                        }}
                      >
                        Create account
                      </Link>
                    )}
                  </div>
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
                  {loading ? "Signing you in…" : "Sign in →"}
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
                    setNoAccount(false);
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

        {!IS_DEV_MODE && (
          <p
            style={{
              textAlign: "center",
              fontSize: 13,
              color: "#aaa",
              marginTop: 16,
            }}
          >
            No account yet?{" "}
            <Link
              href="https://db.zizka.ai/signup"
              style={{ color: "#555", textDecoration: "none", fontWeight: 500 }}
            >
              Create one free →
            </Link>
          </p>
        )}
        <p
          style={{
            textAlign: "center",
            fontSize: 13,
            color: "#ccc",
            marginTop: 8,
          }}
        >
          Self-hosting?{" "}
          <a href="https://github.com/Zizka-ai/ZizkaDB/wiki" style={{ color: "#aaa", textDecoration: "none" }}>
            View setup guide →
          </a>
        </p>
      </div>
    </div>
  );
}
