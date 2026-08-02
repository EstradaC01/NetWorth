import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Paths reachable without a session. Everything else requires one. */
const PUBLIC_PATHS = ['/login', '/signup', '/auth']

/**
 * Refreshes the Supabase session on every request and guards private routes.
 *
 * Two things here are load-bearing and easy to get wrong:
 *
 *  1. We call `getUser()`, not `getSession()`. Only `getUser()` revalidates
 *     the JWT against the auth server; `getSession()` trusts whatever is in
 *     the cookie, which a client can forge.
 *
 *  2. We must return the *same* `supabaseResponse` object that the client
 *     wrote refreshed cookies onto. Returning a fresh `NextResponse.next()`
 *     silently discards the rotated token, and users get logged out once the
 *     old access token expires.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Signed-in users have no business on the auth screens.
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
