import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Every path except static assets and images. Notably this DOES include
     * page routes, so the session is refreshed on ordinary navigation.
     */
    '/((?!_next/static|_next/image|favicon.ico|broadsheet/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
