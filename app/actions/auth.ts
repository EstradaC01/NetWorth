'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export type AuthState = { error: string | null; notice?: string }

/** Redirect targets must be same-origin paths — never an absolute URL. */
function safeNext(raw: FormDataEntryValue | null): string {
  const v = typeof raw === 'string' ? raw : ''
  return v.startsWith('/') && !v.startsWith('//') ? v : '/dashboard'
}

export async function signIn(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const next = safeNext(formData.get('next'))

  if (!email || !password)
    return { error: 'Enter an email and a password to continue.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Deliberately generic: a message that distinguishes "no such account"
    // from "wrong password" turns this form into an account-existence oracle.
    return { error: 'Email or password is incorrect.' }
  }

  revalidatePath('/', 'layout')
  redirect(next)
}

export async function signUp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')

  if (!email || !password) return { error: 'Enter an email and a password.' }
  if (password.length < 8)
    return { error: 'Use at least 8 characters for your password.' }
  if (password !== confirm) return { error: 'Those passwords do not match.' }

  const supabase = await createClient()
  const origin = (await headers()).get('origin') ?? ''

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  })

  if (error) {
    return { error: error.message }
  }

  // With email confirmation ON (the hosted default) no session is returned
  // and the user must click through the emailed link first. Locally,
  // confirmations are off and sign-up logs straight in.
  if (!data.session) {
    return {
      error: null,
      notice: 'Check your email for a confirmation link to finish signing up.',
    }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
