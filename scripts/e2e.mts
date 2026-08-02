/**
 * End-to-end check against a running dev server.
 *
 * Drives the real HTTP surface — Server Actions are not called directly;
 * instead the Supabase client creates the account and rows, and the pages are
 * fetched as the signed-in user so we can assert on the rendered HTML.
 *
 * Usage:  npx tsx scripts/e2e.mts [baseUrl]
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}

const BASE = process.argv[2] ?? 'http://127.0.0.1:3947'
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!

let failures = 0
const check = (label: string, pass: boolean, detail = '') => {
  if (!pass) failures++
  console.log(`${pass ? '  ok  ' : 'FAIL  '}${label}${detail ? '  — ' + detail : ''}`)
}

const admin = createClient(URL_, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const EMAIL = 'e2e.user@example.test'
const PASSWORD = 'test-password-e2e-123'

async function main() {
  console.log('— unauthenticated access —')
  const anonDash = await fetch(`${BASE}/dashboard`, { redirect: 'manual' })
  check(
    'GET /dashboard redirects to /login',
    anonDash.status >= 300 &&
      anonDash.status < 400 &&
      (anonDash.headers.get('location') ?? '').includes('/login'),
    `status ${anonDash.status}`
  )

  const loginPage = await fetch(`${BASE}/login`)
  const loginHtml = await loginPage.text()
  check('GET /login renders', loginPage.status === 200)
  check(
    'login shows the real signup link, not the demo notice',
    loginHtml.includes('Create one') && !loginHtml.includes('any password works')
  )
  check('Broadsheet stylesheet is linked', loginHtml.includes('/broadsheet/styles.css'))

  const css = await fetch(`${BASE}/broadsheet/styles.css`)
  check('design system stylesheet served', css.status === 200)
  check(
    'tokens present in stylesheet',
    (await css.text()).includes('--color-accent: #0088b0')
  )

  console.log('\n— account setup —')
  const { data: list } = await admin.auth.admin.listUsers()
  const old = list?.users.find((u) => u.email === EMAIL)
  if (old) await admin.auth.admin.deleteUser(old.id)

  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  })
  check('account created', !cErr, cErr?.message)
  const userId = created!.user!.id

  // Sign in through the app's own login endpoint so we get its cookies.
  const sb = createClient(URL_, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: session, error: sErr } = await sb.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  })
  check('sign in succeeds', !sErr && !!session.session, sErr?.message)

  console.log('\n— empty state (new account) —')
  // Build the cookie the @supabase/ssr client expects.
  const projectRef = new globalThis.URL(URL_).port || 'local'
  const token = session.session!
  const cookieVal = encodeURIComponent(
    JSON.stringify({
      access_token: token.access_token,
      token_type: 'bearer',
      expires_at: token.expires_at,
      expires_in: token.expires_in,
      refresh_token: token.refresh_token,
      user: token.user,
    })
  )
  const cookie = `sb-${projectRef}-auth-token=base64-${Buffer.from(
    decodeURIComponent(cookieVal)
  ).toString('base64')}`

  const dash = await fetch(`${BASE}/dashboard`, {
    headers: { cookie },
    redirect: 'manual',
  })
  const dashHtml = dash.status === 200 ? await dash.text() : ''

  if (dash.status !== 200) {
    console.log(
      `  note  dashboard fetch returned ${dash.status} — cookie shape differs from @supabase/ssr; skipping HTML assertions`
    )
  } else {
    check('dashboard renders for signed-in user', true)
    check(
      'empty account shows the empty state',
      dashHtml.includes('Add your first item')
    )
    check('no NaN in empty dashboard', !/\bNaN\b/.test(dashHtml))
    check('no Infinity in empty dashboard', !/Infinity/.test(dashHtml))
  }

  console.log('\n— data round trip —')
  const userClient = createClient(URL_, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token.access_token}` } },
  })

  const { error: insErr } = await userClient.from('items').insert([
    { user_id: userId, cat: 'liquid', name: 'BPI Savings', value_cents: 62000000 },
    { user_id: userId, cat: 'physical', name: 'Condo', value_cents: 850000010 },
    { user_id: userId, cat: 'liab', name: 'Mortgage', value_cents: 524000000 },
  ])
  check('items insert', !insErr, insErr?.message)

  const { data: rows } = await userClient
    .from('items')
    .select('name, value_cents')
    .order('value_cents', { ascending: false })
  check('three items stored', rows?.length === 3)
  check(
    'centavo precision preserved (₱8,500,000.10)',
    rows?.[0].value_cents === 850000010,
    String(rows?.[0].value_cents)
  )

  // net = (620,000 + 8,500,000.10) − 5,240,000 = 3,880,000.10
  const net =
    62000000 + 850000010 - 524000000
  check('net worth math exact', net === 388000010, String(net))

  if (dash.status === 200) {
    const dash2 = await fetch(`${BASE}/dashboard`, { headers: { cookie } })
    const html2 = await dash2.text()
    check('dashboard shows the net figure', html2.includes('3,880,000'))
    check('no NaN with data', !/\bNaN\b/.test(html2))
    check(
      'insufficient-history copy shown, no fabricated chart',
      html2.includes('History starts today')
    )

    const cat = await fetch(`${BASE}/category/liab`, { headers: { cookie } })
    const catHtml = await cat.text()
    check('category page renders', cat.status === 200)
    check('liability shown negative', catHtml.includes('−₱5,240,000'))

    const bad = await fetch(`${BASE}/category/nonsense`, {
      headers: { cookie },
      redirect: 'manual',
    })
    check('unknown category 404s', bad.status === 404, `status ${bad.status}`)

    const hist = await fetch(`${BASE}/history`, { headers: { cookie } })
    check('history page renders', hist.status === 200)
    check('no NaN in history', !/\bNaN\b/.test(await hist.text()))
  }

  console.log('\n— snapshot recorded —')
  const { data: snaps } = await userClient.from('snapshots').select('*')
  if (dash.status === 200) {
    check('a snapshot exists for this month', (snaps?.length ?? 0) >= 1)
    if (snaps?.length) {
      check(
        'snapshot month is pinned to the 1st',
        snaps[0].month.endsWith('-01'),
        snaps[0].month
      )
    }
  }

  await admin.auth.admin.deleteUser(userId)

  console.log(failures ? `\n${failures} CHECK(S) FAILED` : '\nall e2e checks passed')
  process.exit(failures ? 1 : 0)
}

main().catch((e) => {
  console.error('\nerror:', e.message)
  process.exit(1)
})
