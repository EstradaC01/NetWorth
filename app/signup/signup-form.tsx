'use client'

import { useActionState } from 'react'
import { signUp, type AuthState } from '@/app/actions/auth'
import { AuthSwitch, FieldLabel } from '@/components/auth-shell'
import { ThemeToggleLink } from '@/components/theme-toggle'

const initial: AuthState = { error: null }

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, initial)

  return (
    <form action={formAction}>
      <h2 style={{ fontSize: 28, letterSpacing: '-.02em', margin: 0 }}>
        Create account
      </h2>
      <AuthSwitch prompt="Already have one?" href="/login" label="Sign in." />
      <p style={{ color: 'var(--nw-muted)', fontSize: 14, margin: '-18px 0 24px' }}>
        Prefer no account? <a href="/local/dashboard">Use local-only mode.</a>
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <label style={{ display: 'block' }}>
          <FieldLabel>Email</FieldLabel>
          <input
            className="nw-input"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@email.ph"
          />
        </label>
        <label style={{ display: 'block' }}>
          <FieldLabel>Password</FieldLabel>
          <input
            className="nw-input"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="At least 8 characters"
          />
        </label>
        <label style={{ display: 'block' }}>
          <FieldLabel>Confirm password</FieldLabel>
          <input
            className="nw-input"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
          />
        </label>
      </div>

      {state.error && (
        <div
          role="alert"
          style={{
            marginTop: 14,
            fontSize: 13.5,
            color: 'var(--color-accent-2-600)',
          }}
        >
          {state.error}
        </div>
      )}

      {state.notice && (
        <div
          role="status"
          style={{
            marginTop: 14,
            fontSize: 13.5,
            color: 'var(--color-accent)',
          }}
        >
          {state.notice}
        </div>
      )}

      <button
        type="submit"
        className="nw-btn-primary"
        disabled={pending}
        style={{ width: '100%', marginTop: 26, padding: 13, fontSize: 15.5 }}
      >
        {pending ? 'Creating account…' : 'Create account'}
      </button>

      <ThemeToggleLink />
    </form>
  )
}
