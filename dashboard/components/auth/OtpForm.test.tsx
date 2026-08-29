import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { AuthRequestError, requestOtp } = vi.hoisted(() => {
  class AuthRequestError extends Error {
    readonly status: number
    constructor(message: string, status: number) {
      super(message)
      this.name = 'AuthRequestError'
      this.status = status
    }
  }
  return { AuthRequestError, requestOtp: vi.fn() }
})

vi.mock('@/lib/api', () => ({
  AuthRequestError,
  requestOtp,
}))

import { OtpForm } from './OtpForm'

beforeEach(() => {
  requestOtp.mockReset()
  requestOtp.mockResolvedValue({})
})

describe('OtpForm', () => {
  it('sends login requestOtp without mixing in signup fields', async () => {
    render(<OtpForm intent="login" onVerified={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'you@company.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send code/i }))

    await waitFor(() =>
      expect(requestOtp).toHaveBeenCalledWith('you@company.com', 'login'),
    )
    expect(requestOtp.mock.calls[0]).toHaveLength(2)
    expect(screen.getByText(/we sent a 6-digit code to/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /resend code in/i })).toBeDisabled()
  })

  it('sends signup requestOtp with intent signup only', async () => {
    render(<OtpForm intent="signup" onVerified={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Work email'), {
      target: { value: 'new@company.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send verification code/i }))

    await waitFor(() =>
      expect(requestOtp).toHaveBeenCalledWith('new@company.com', 'signup'),
    )
    expect(requestOtp.mock.calls[0]).toHaveLength(2)
  })

  it('shows create-account on login 404, not the signup sign-in link', async () => {
    requestOtp.mockRejectedValueOnce(new AuthRequestError('No account', 404))
    render(<OtpForm intent="login" onVerified={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'missing@company.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send code/i }))
    await waitFor(() => expect(screen.getByText('Create account')).toBeInTheDocument())
    expect(screen.queryByText('Sign in →')).not.toBeInTheDocument()
  })

  it('shows sign-in on signup 409, not the login create-account CTA', async () => {
    requestOtp.mockRejectedValueOnce(new AuthRequestError('Taken', 409))
    render(<OtpForm intent="signup" onVerified={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Work email'), {
      target: { value: 'taken@company.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send verification code/i }))
    await waitFor(() => expect(screen.getByText('Sign in →')).toBeInTheDocument())
    expect(screen.queryByText('Create account')).not.toBeInTheDocument()
  })

  it('calls onVerified with email and otp and keeps requestOtp payloads separate', async () => {
    const onVerified = vi.fn().mockResolvedValue(undefined)
    render(<OtpForm intent="login" onVerified={onVerified} />)

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'you@company.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send code/i }))
    await waitFor(() => expect(screen.getByLabelText('Login code')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('Login code'), {
      target: { value: '123456' },
    })

    await waitFor(() =>
      expect(onVerified).toHaveBeenCalledWith({
        email: 'you@company.com',
        otp: '123456',
      }),
    )
    expect(requestOtp).toHaveBeenCalledWith('you@company.com', 'login')
  })

  it('unlocks when onVerified returns aborted', async () => {
    const onVerified = vi.fn().mockResolvedValue('aborted')
    render(<OtpForm intent="signup" onVerified={onVerified} />)

    fireEvent.change(screen.getByLabelText('Work email'), {
      target: { value: 'you@company.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send verification code/i }))
    await waitFor(() =>
      expect(screen.getByLabelText('Verification code')).toBeInTheDocument(),
    )

    fireEvent.change(screen.getByLabelText('Verification code'), {
      target: { value: '654321' },
    })

    await waitFor(() => expect(onVerified).toHaveBeenCalled())
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /create account/i }),
      ).not.toBeDisabled(),
    )
  })
})
