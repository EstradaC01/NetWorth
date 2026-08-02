import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST only, deliberately: a GET sign-out can be triggered by a link
 * prefetch or an <img src> on any page, logging the user out unbidden.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', request.url), {
    status: 303,
  })
}
