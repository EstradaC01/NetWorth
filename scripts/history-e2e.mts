/**
 * Exercises the multi-month history chart, which a fresh account cannot reach
 * (it only ever has one snapshot). Seeds backdated snapshot rows directly,
 * then asserts the chart, legend and comparison table render real data with
 * no NaN.
 *
 * Usage:  npx tsx scripts/history-e2e.mts [baseUrl]
 */
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, mkdirSync } from 'node:fs'

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}

const BASE = process.argv[2] ?? 'http://127.0.0.1:3947'
const SHOTS = 'scripts/screenshots'
mkdirSync(SHOTS, { recursive: true })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const EMAIL = `history.${Date.now()}@example.test`
const PASSWORD = 'test-password-history-123'

let failures = 0
const check = (label: string, pass: boolean, detail = '') => {
  if (!pass) failures++
  console.log(`${pass ? '  ok  ' : 'FAIL  '}${label}${detail ? '  — ' + detail : ''}`)
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
  page.on('pageerror', (e) => {
    failures++
    console.log('FAIL  uncaught page error — ' + e.message)
  })

  await page.goto(`${BASE}/signup`)
  await page.fill('input[name="email"]', EMAIL)
  await page.fill('input[name="password"]', PASSWORD)
  await page.fill('input[name="confirm"]', PASSWORD)
  await page.getByRole('button', { name: /Create account/ }).click()
  await page.waitForURL('**/dashboard', { timeout: 20000 })

  const { data: list } = await admin.auth.admin.listUsers()
  const userId = list!.users.find((u) => u.email === EMAIL)!.id

  // A real portfolio, then 15 months of backdated readings that grow.
  await admin.from('items').insert([
    { user_id: userId, cat: 'liquid', name: 'BPI Savings', value_cents: 79280000 },
    { user_id: userId, cat: 'invest', name: 'Index funds', value_cents: 418000000 },
    { user_id: userId, cat: 'physical', name: 'Condo', value_cents: 949500000 },
    { user_id: userId, cat: 'liab', name: 'Mortgage', value_cents: 566540000 },
  ])

  const months: string[] = []
  const now = new Date('2026-08-01T00:00:00Z')
  for (let back = 15; back >= 1; back--) {
    const d = new Date(now)
    d.setUTCMonth(d.getUTCMonth() - back)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`
    months.push(key)
    const growth = 1 - back * 0.03
    await admin.from('snapshots').insert({
      user_id: userId,
      month: key,
      liquid_cents: Math.round(79280000 * growth),
      invest_cents: Math.round(418000000 * growth),
      physical_cents: Math.round(949500000 * growth),
      liab_cents: Math.round(566540000 * (1 + back * 0.004)),
    })
  }
  console.log(`seeded ${months.length} months: ${months[0]} → ${months.at(-1)}`)

  console.log('\n— dashboard with real history —')
  await page.goto(`${BASE}/dashboard`)
  await page.waitForTimeout(1200)
  const dashText = await page.locator('body').innerText()
  check('no NaN/Infinity on dashboard', !/\bNaN\b|Infinity/.test(dashText))
  check(
    'twelve-month delta now shown',
    dashText.includes('past 12 months'),
    dashText.includes('Change over time appears') ? 'still showing placeholder' : ''
  )

  const paths = await page.locator('svg[role="img"] path').count()
  check('sparkline path rendered', paths >= 1, `${paths} paths`)
  const d = await page.locator('svg[role="img"] path').first().getAttribute('d')
  check('path data is valid', !!d && !/NaN|Infinity/.test(d), (d ?? '').slice(0, 60))

  console.log('\n— range toggles —')
  for (const label of ['6M', '1Y', 'ALL']) {
    await page.getByRole('button', { name: label, exact: true }).click()
    await page.waitForTimeout(400)
    const dd = await page.locator('svg[role="img"] path').first().getAttribute('d')
    check(`${label} range renders cleanly`, !!dd && !/NaN|Infinity/.test(dd))
  }
  await page.screenshot({ path: `${SHOTS}/06-dashboard-history.png` })

  console.log('\n— chart hover —')
  const box = await page.locator('svg rect[fill="transparent"]').first().boundingBox()
  if (box) {
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2)
    await page.waitForTimeout(400)
    const tip = await page.locator('body').innerText()
    check('hover tooltip appears', /₱/.test(tip))
    check('no NaN while hovering', !/\bNaN\b|Infinity/.test(tip))
  }

  console.log('\n— history page —')
  await page.goto(`${BASE}/history`)
  await page.waitForTimeout(1200)
  const histText = await page.locator('body').innerText()
  check('multi-series chart shown (not the empty copy)', !histText.includes('History starts'))
  check('no NaN/Infinity on history', !/\bNaN\b|Infinity/.test(histText))

  const seriesCount = await page.locator('svg[role="img"] path').count()
  check('five series drawn', seriesCount === 5, `${seriesCount} paths`)

  const allD = await page.locator('svg[role="img"] path').evaluateAll((els) =>
    els.map((e) => e.getAttribute('d') ?? '')
  )
  check('every series path is valid', allD.every((x) => x && !/NaN|Infinity/.test(x)))
  check('comparison table lists net worth', histText.includes('Net worth'))
  await page.screenshot({ path: `${SHOTS}/07-history-chart.png`, fullPage: true })

  console.log('\n— legend toggle —')
  await page.getByRole('button', { name: /Liabilities/ }).click()
  await page.waitForTimeout(400)
  const afterToggle = await page.locator('svg[role="img"] path').count()
  check('hiding a series removes its path', afterToggle === 4, `${afterToggle} paths`)
  check(
    'no NaN after toggling',
    !/\bNaN\b|Infinity/.test(await page.locator('body').innerText())
  )

  // Hide everything — the degenerate case that produced -Infinity before.
  for (const n of ['Net worth', 'Liquid Cash', 'Investments', 'Physical Assets']) {
    await page.getByRole('button', { name: n, exact: true }).click()
    await page.waitForTimeout(150)
  }
  await page.waitForTimeout(400)
  check(
    'all series hidden renders without NaN',
    !/\bNaN\b|Infinity/.test(await page.locator('body').innerText())
  )
  await page.screenshot({ path: `${SHOTS}/08-history-all-hidden.png` })

  console.log('\n— dark theme —')
  await page.goto(`${BASE}/history`)
  await page.locator('button[title*="Switch to"]').click()
  await page.waitForTimeout(600)
  check(
    'dark theme history clean',
    !/\bNaN\b|Infinity/.test(await page.locator('body').innerText())
  )
  await page.screenshot({ path: `${SHOTS}/09-history-dark.png`, fullPage: true })

  await browser.close()
  await admin.auth.admin.deleteUser(userId)

  console.log(failures ? `\n${failures} CHECK(S) FAILED` : '\nall history checks passed')
  process.exit(failures ? 1 : 0)
}

main().catch((e) => {
  console.error('\nerror:', e.message)
  process.exit(1)
})
