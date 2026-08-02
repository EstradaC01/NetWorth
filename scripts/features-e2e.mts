/**
 * Browser suite for goals, the activity log, observations and CSV export.
 *
 * Drives a real browser against a running app and a real Supabase project,
 * because the things most worth proving here are not unit-testable: that a
 * Server Action's revalidation actually repaints, that the activity log
 * survives the item it describes being deleted, and that a downloaded CSV is
 * the file a spreadsheet would open.
 *
 *   npx tsx scripts/features-e2e.mts [baseUrl]
 *
 * Defaults to http://localhost:3947 so it never collides with a dev server on
 * 3000. The test user is created confirmed through the admin API (hosted
 * projects have email confirmation on and this suite cannot read a mailbox)
 * and deleted afterwards; the cascade takes its items, snapshots, goal and
 * events with it.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local for user setup only — the
 * app itself is exercised entirely through an ordinary `authenticated`
 * session, which is the role the RLS policies are written against.
 */
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]
    })
)
const SUPA = env.NEXT_PUBLIC_SUPABASE_URL
const SVC = env.SUPABASE_SERVICE_ROLE_KEY
const BASE = process.argv[2] ?? 'http://localhost:3947'

if (!SUPA || !SVC) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

let fail = 0
const check = (label: string, ok: boolean, extra = '') => {
  if (!ok) fail++
  console.log(`${ok ? '  ok  ' : 'FAIL  '}${label}${extra ? '  ' + extra : ''}`)
}

const email = `e2e${Date.now()}@example.com`
const password = 'E2e-passw0rd!x'
const created = await fetch(`${SUPA}/auth/v1/admin/users`, {
  method: 'POST',
  headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, email_confirm: true }),
})
const user = await created.json()
if (!user.id) {
  console.error('Could not create the test user:', user)
  process.exit(1)
}
console.log(`-- ${BASE} · user ${user.id.slice(0, 8)} --\n`)

const browser = await chromium.launch()
const p = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
p.on('pageerror', (e) => {
  console.log('  PAGE ERROR:', e.message)
  fail++
})

try {
  await p.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await p.fill('input[type=email]', email)
  await p.fill('input[type=password]', password)
  await p.click('button[type=submit]')
  await p.waitForURL('**/dashboard', { timeout: 30000 })
  check('signs in and lands on dashboard', true)

  const add = async (name: string, cat: string, value: string) => {
    await p.click('button:has-text("Add item")')
    await p.fill('input[name=name]', name)
    await p.selectOption('select[name=cat]', cat)
    await p.fill('input[name=value]', value)
    await p.click('button[type=submit]:has-text("Add item")')
    // The dialog closes only once the action resolves, so its disappearance
    // is the signal that the save completed — not an arbitrary delay.
    await p.locator('[role=dialog]').waitFor({ state: 'detached', timeout: 30000 })
  }
  await add('BPI Savings', 'liquid', '450000')
  await add('Condo, Makati', 'physical', '4200000')
  await add('Car loan', 'liab', '380000')

  // Reloaded rather than trusting post-action revalidation to have painted:
  // the assertion is about the figure, not about revalidation timing.
  await p.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(800)
  const dash = (await p.textContent('body')) ?? ''
  check(
    'net worth is 450k + 4.2M − 380k',
    /₱4,270,000/.test(dash),
    dash.match(/₱[\d,]{7,}/)?.[0] ?? 'no figure'
  )
  check('observations strip rendered', /Observations/.test(dash))
  check('largest holding insight', /Largest holding/.test(dash))
  check('debt ratio insight', /Debt ratio/.test(dash))
  check('set-a-goal prompt when none set', /Set a goal/.test(dash))

  // ── Goal ───────────────────────────────────────────────────────────────
  await p.click('a[href="/goal"]')
  await p.waitForURL('**/goal')
  await p.fill('input[name=target]', '10000000')
  await p.fill('input[name=target_date]', '2028-12-01')
  await p.fill('input[name=note]', 'House deposit')
  // Scoped by label: the header's sign-out form also holds a submit button.
  await p.click('button[type=submit]:has-text("Set goal")')
  // Wait for the meter itself rather than a fixed sleep: a Server Action
  // round-trip plus revalidation against a hosted database is comfortably
  // slower than a local one, and a timeout here reads as a broken feature.
  await p.locator('[role=progressbar]').first().waitFor({ timeout: 30000 })
  const goal = (await p.textContent('body')) ?? ''
  check('goal saved', /₱10,000,000/.test(goal))
  check('progressbar rendered', (await p.locator('[role=progressbar]').count()) > 0)
  check('remaining distance shown', /₱5,730,000 to go/.test(goal), '')
  check('deadline year is unambiguous', /Dec 2028/.test(goal) && !/by Dec 28\b/.test(goal), '')
  // One month of history only: a projection must be refused, not invented.
  check('projection withheld without data', /at least two monthly readings/i.test(goal), '')

  await p.click('a[href="/dashboard"]')
  await p.waitForURL('**/dashboard')
  await p.waitForTimeout(700)
  check('goal meter also on dashboard', /to go/.test((await p.textContent('body')) ?? ''))

  // ── Activity log ───────────────────────────────────────────────────────
  await p.goto(`${BASE}/history`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(900)
  const h1 = (await p.textContent('body')) ?? ''
  check('activity feed rendered', /Activity/.test(h1))
  check('three adds logged', (h1.match(/Added/g) ?? []).length >= 3, `count=${(h1.match(/Added/g) ?? []).length}`)
  check('a new liability reads as negative', /−₱380,000/.test(h1), '')
  check('export links rendered', /Monthly history \(CSV\)/.test(h1))

  await p.goto(`${BASE}/category/liquid`, { waitUntil: 'networkidle' })
  await p.click('button:has-text("Edit")')
  await p.fill('input[name=value]', '600000')
  await p.click('button[type=submit]:has-text("Save changes")')
  await p.locator('[role=dialog]').waitFor({ state: 'detached', timeout: 30000 })
  await p.goto(`${BASE}/history`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(800)
  const h2 = (await p.textContent('body')) ?? ''
  check('edit logged as Changed', /Changed/.test(h2))
  check('before → after shown', /₱450k\s*→\s*₱600k/.test(h2), '')
  check('edit delta is +₱150,000', /\+₱150,000/.test(h2), '')

  await p.goto(`${BASE}/category/liab`, { waitUntil: 'networkidle' })
  await p.click('button:has-text("Delete")')
  // "Nothing here yet." appears optimistically, before the round-trip
  // finishes, so it cannot be the signal — poll the history page until the
  // deletion event is actually readable from the database.
  let h3 = ''
  for (let i = 0; i < 20; i++) {
    await p.goto(`${BASE}/history`, { waitUntil: 'networkidle' })
    h3 = (await p.textContent('body')) ?? ''
    if (/Removed/.test(h3)) break
    await p.waitForTimeout(1000)
  }
  // The whole point of denormalising the log: the name outlives the row.
  check('deletion logged, name outlives the item', /Removed/.test(h3) && /Car loan/.test(h3))
  check('clearing debt reads as a gain', /\+₱380,000/.test(h3), '')

  // ── CSV ────────────────────────────────────────────────────────────────
  const [download] = await Promise.all([
    p.waitForEvent('download'),
    p.click('a[href="/export?kind=items"]'),
  ])
  const csv = readFileSync((await download.path())!, 'utf8')
  check('items CSV downloads', csv.includes('Name,Category'))
  check('comma in a name is quoted', csv.includes('"Condo, Makati"'), '')
  check('amount is a plain summable number', /\b4200000\.00\b/.test(csv), '')
  check('filename is dated', /networth-items-\d{4}-\d{2}\.csv/.test(download.suggestedFilename()), download.suggestedFilename())

  // ── Dark theme ─────────────────────────────────────────────────────────
  await p.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
  await p.click('.nw-btn-icon')
  await p.waitForTimeout(700)
  check('dark theme applies', (await p.getAttribute('html', 'data-nw-theme')) === 'dark')
} finally {
  await browser.close()
  await fetch(`${SUPA}/auth/v1/admin/users/${user.id}`, {
    method: 'DELETE',
    headers: { apikey: SVC, Authorization: `Bearer ${SVC}` },
  })
  console.log('\n(test user deleted)')
}

console.log(fail ? `\n${fail} FAILED` : '\nall passed')
process.exit(fail ? 1 : 0)
