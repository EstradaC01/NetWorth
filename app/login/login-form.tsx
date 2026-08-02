'use client'

import { useActionState } from 'react'
import { signIn, type AuthState } from '@/app/actions/auth'
import { AuthSwitch, FieldLabel } from '@/components/auth-shell'
import { ThemeToggleLink } from '@/components/theme-toggle'

const initial: AuthState = { error: null }

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signIn, initial)

  return (
    <form action={formAction}>
      <h2 style={{ fontSize: 28, letterSpacing: '-.02em', margin: 0 }}>
        Sign in
      </h2>
      <AuthSwitch prompt="No account?" href="/signup" label="Create one." />

      <input type="hidden" name="next" value={next ?? '/dashboard'} />

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
            autoComplete="current-password"
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

      <button
        type="submit"
        className="nw-btn-primary"
        disabled={pending}
        style={{
          width: '100%',
          marginTop: 26,
          padding: 13,
          fontSize: 15.5,
        }}
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>

      <ThemeToggleLink />
    </form>
  )
}
