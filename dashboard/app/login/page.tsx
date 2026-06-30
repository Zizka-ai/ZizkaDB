'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { requestOtp, verifyOtp } from '@/lib/api';
import { getToken, setToken } from '@/lib/auth';
import { BrandLogo } from '@/components/BrandLogo';

const IS_DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === 'true';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fafafa',
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#888',
      }}
    >
      Loading…
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const [error, setError] = useState('');

  const nextPath = searchParams.get('next');
  const safeNext =
    nextPath && nextPath.startsWith('/dashboard') && !nextPath.startsWith('//')
      ? nextPath
      : '/dashboard';

  useEffect(() => {
    const existing = getToken();
    if (existing) {
      setToken(existing);
      router.replace(safeNext);
    }
  }, [router, safeNext]);

  async function handleDevLogin() {
    setDevLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/v1/auth/dev-token`, { method: 'POST' });
      if (!res.ok) throw new Error('Dev token failed');
      const data = (await res.json()) as { access_token: string };
      setToken(data.access_token);
      router.push(safeNext);
    } catch {
      setError('Could not connect to ZizkaDB API. Is docker-compose running on port 8000?');
    } finally {
      setDevLoading(false);
    }
  }

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await requestOtp(email);
      setStep('otp');
    } catch {
      setError('Failed to send code. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await verifyOtp(email, otp);
      setToken(data.access_token);
      router.replace(safeNext);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fafafa',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ width: '100%', maxWidth: 400, padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <BrandLogo variant='full' suffix='The operational database for AI agents' />
        </div>

        {/* Dev Mode Banner — shown only in self-hosted mode */}
        {IS_DEV_MODE && (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span
                style={{
                  background: '#22c55e',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 99,
                  letterSpacing: '0.05em',
                }}
              >
                SELF-HOSTED
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>
                Local dev mode
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#166534', margin: '0 0 12px' }}>
              Running your own ZizkaDB instance? Open the dashboard directly — no account needed.
            </p>
            <button
              onClick={handleDevLogin}
              disabled={devLoading}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 9,
                fontSize: 14,
                fontWeight: 600,
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                opacity: devLoading ? 0.6 : 1,
              }}
            >
              {devLoading ? 'Connecting...' : 'Open my dashboard →'}
            </button>
          </div>
        )}

        {/* Standard email login card */}
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: '36px 32px',
            border: '1px solid #e5e5e5',
            boxShadow: '0 2px 20px rgba(0,0,0,0.05)',
          }}
        >
          {IS_DEV_MODE && (
            <p
              style={{
                fontSize: 12,
                color: '#aaa',
                marginTop: 0,
                marginBottom: 20,
                textAlign: 'center',
              }}
            >
              Or sign in with managed service account
            </p>
          )}

          {step === 'email' ? (
            <>
              {!IS_DEV_MODE && (
                <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 6 }}>
                  Sign in
                </h1>
              )}
              {!IS_DEV_MODE && (
                <p style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>
                  Enter your email and we&apos;ll send a 6-digit login code.
                </p>
              )}
              <form
                onSubmit={handleRequestOtp}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#555',
                      marginBottom: 6,
                    }}
                  >
                    Email address
                  </label>
                  <input
                    type='email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder='you@company.com'
                    required
                    autoFocus={!IS_DEV_MODE}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 14px',
                      borderRadius: 9,
                      fontSize: 14,
                      border: '1px solid #ddd',
                      outline: 'none',
                      color: '#111',
                      background: '#fafafa',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#111')}
                    onBlur={(e) => (e.target.style.borderColor = '#ddd')}
                  />
                </div>
                {error && <p style={{ fontSize: 13, color: '#ef4444' }}>{error}</p>}
                <button
                  type='submit'
                  disabled={loading || !email}
                  style={{
                    padding: '11px',
                    borderRadius: 9,
                    fontSize: 14,
                    fontWeight: 500,
                    background: '#111',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    opacity: loading || !email ? 0.4 : 1,
                  }}
                >
                  {loading ? 'Sending...' : 'Send code →'}
                </button>
                <p style={{ fontSize: 12, color: '#bbb', textAlign: 'center' }}>
                  We send a 6-digit code to your email. No password needed.
                </p>
              </form>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 6 }}>
                Check your email
              </h1>
              <p style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>
                We sent a 6-digit code to <strong style={{ color: '#111' }}>{email}</strong>
              </p>
              <form
                onSubmit={handleVerifyOtp}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#555',
                      marginBottom: 6,
                    }}
                  >
                    Login code
                  </label>
                  <input
                    type='text'
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder='000000'
                    required
                    autoFocus
                    maxLength={6}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '12px',
                      borderRadius: 9,
                      fontSize: 24,
                      border: '1px solid #ddd',
                      outline: 'none',
                      color: '#111',
                      background: '#fafafa',
                      textAlign: 'center',
                      letterSpacing: '0.4em',
                      fontFamily: 'monospace',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#111')}
                    onBlur={(e) => (e.target.style.borderColor = '#ddd')}
                  />
                </div>
                {error && <p style={{ fontSize: 13, color: '#ef4444' }}>{error}</p>}
                <button
                  type='submit'
                  disabled={loading || otp.length < 6}
                  style={{
                    padding: '11px',
                    borderRadius: 9,
                    fontSize: 14,
                    fontWeight: 500,
                    background: '#111',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    opacity: loading || otp.length < 6 ? 0.4 : 1,
                  }}
                >
                  {loading ? 'Verifying...' : 'Sign in →'}
                </button>
                <button
                  type='button'
                  onClick={() => {
                    setStep('email');
                    setOtp('');
                    setError('');
                  }}
                  style={{
                    fontSize: 13,
                    color: '#888',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  ← Use a different email
                </button>
              </form>
            </>
          )}
        </div>

        {!IS_DEV_MODE && (
          <p style={{ textAlign: 'center', fontSize: 13, color: '#aaa', marginTop: 16 }}>
            No account yet?{' '}
            <a href='/signup' style={{ color: '#555', textDecoration: 'none', fontWeight: 500 }}>
              Create one free →
            </a>
          </p>
        )}
        <p style={{ textAlign: 'center', fontSize: 13, color: '#ccc', marginTop: 8 }}>
          Self-hosting?{' '}
          <a href='/docs' style={{ color: '#aaa', textDecoration: 'none' }}>
            View setup guide →
          </a>
        </p>
      </div>
    </div>
  );
}
