import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Email-confirmation landing point.
 *
 * Local Supabase ships with confirmations disabled, so this is unused in dev —
 * it exists so that enabling confirmations on a hosted project (where they are
 * on by default) does not break sign-up.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/dashboard'
  // Only same-origin paths; never redirect to an attacker-supplied host.
  const next =
    rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent('That confirmation link is invalid or has expired.')}`
  )
}
