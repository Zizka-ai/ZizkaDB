'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { requestOtp, verifyOtp } from '@/lib/api';
import { setToken } from '@/lib/auth';
import { BrandLogo } from '@/components/BrandLogo';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await requestOtp(email);
      setStep('otp');
    } catch {
      setError('Could not send code. Please try again.');
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
      router.replace('/dashboard');
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
      <div style={{ width: '100%', maxWidth: 420, padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <BrandLogo variant='full' suffix='The operational database for AI agents' />
        </div>

        {/* Card */}
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: '36px 32px',
            border: '1px solid #e5e5e5',
            boxShadow: '0 2px 20px rgba(0,0,0,0.05)',
          }}
        >
          {step === 'email' ? (
            <>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 6 }}>
                Create your account
              </h1>
              <p style={{ fontSize: 14, color: '#888', marginBottom: 24, lineHeight: 1.6 }}>
                Enter your email. We send a 6-digit code — no password needed.
              </p>
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
                    Work email
                  </label>
                  <input
                    type='email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder='you@company.com'
                    required
                    autoFocus
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
                {error && <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>{error}</p>}
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
                  {loading ? 'Sending...' : 'Send verification code →'}
                </button>
                <p style={{ fontSize: 12, color: '#bbb', textAlign: 'center', margin: 0 }}>
                  Free to start. No credit card required.
                </p>
              </form>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 6 }}>
                Verify your email
              </h1>
              <p style={{ fontSize: 14, color: '#888', marginBottom: 24, lineHeight: 1.6 }}>
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
                    Verification code
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
                      fontSize: 28,
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
                {error && <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>{error}</p>}
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
                  {loading ? 'Verifying...' : 'Create account →'}
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

        <p style={{ textAlign: 'center', fontSize: 13, color: '#aaa', marginTop: 20 }}>
          Already have an account?{' '}
          <Link href='/login' style={{ color: '#555', textDecoration: 'none', fontWeight: 500 }}>
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  );
}
