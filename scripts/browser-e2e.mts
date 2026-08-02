/**
 * Full user journey in a real browser: sign up, add items, edit, delete,
 * navigate, toggle theme, sign out.
 *
 * This drives the actual UI rather than forging session cookies, so it
 * exercises Server Actions, the modal, and middleware exactly as a user does.
 *
 * Usage:  npx tsx scripts/browser-e2e.mts [baseUrl]
 */
import { chromium, type Page } from 'playwright'
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

const EMAIL = `browser.${Date.now()}@example.test`
const PASSWORD = 'test-password-browser-123'

let failures = 0
const check = (label: string, pass: boolean, detail = '') => {
  if (!pass) failures++
  console.log(`${pass ? '  ok  ' : 'FAIL  '}${label}${detail ? '  — ' + detail : ''}`)
}

/** Fails if the rendered page contains NaN/Infinity anywhere. */
async function assertNoBadNumbers(page: Page, where: string) {
  const text = await page.locator('body').innerText()
  check(`no NaN/Infinity on ${where}`, !/\bNaN\b|Infinity/.test(text))
}

/**
 * The header trigger and the modal's submit button share the accessible name
 * "Add item", so every selector below is scoped to the dialog rather than
 * relying on document order.
 */
async function addItem(
  page: Page,
  name: string,
  cat: string,
  value: string,
  notes = ''
) {
  console.log(`      adding "${name}"…`)
  // Open via whichever trigger this page offers.
  const firstItemCta = page.getByText('Add your first item')
  if (await firstItemCta.isVisible().catch(() => false)) {
    await firstItemCta.click()
  } else {
    await page
      .getByRole('button', { name: /^Add item$/ })
      .filter({ hasNot: page.locator('[type="submit"]') })
      .first()
      .click()
  }

  const dialog = page.getByRole('dialog')
  await dialog.waitFor({ state: 'visible' })
  await dialog.locator('input[name="name"]').fill(name)
  await dialog.locator('select[name="cat"]').selectOption(cat)
  await dialog.locator('input[name="value"]').fill(value)
  if (notes) await dialog.locator('input[name="notes"]').fill(notes)
  await dialog.locator('button[type="submit"]').click()
  await dialog.waitFor({ state: 'hidden', timeout: 20000 })
  // Let the revalidated server data land before asserting on it.
  await page.waitForTimeout(800)
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  page.on('pageerror', (e) => {
    failures++
    console.log('FAIL  uncaught page error — ' + e.message)
  })

  console.log('— sign up —')
  await page.goto(`${BASE}/signup`)
  await page.fill('input[name="email"]', EMAIL)
  await page.fill('input[name="password"]', PASSWORD)
  await page.fill('input[name="confirm"]', PASSWORD)
  await page.getByRole('button', { name: /Create account/ }).click()
  await page.waitForURL('**/dashboard', { timeout: 20000 })
  check('signup lands on the dashboard', page.url().includes('/dashboard'))

  console.log('\n— empty state —')
  await page.getByText('Add your first item').waitFor({ timeout: 10000 })
  check('empty state shown for a new account', true)
  await assertNoBadNumbers(page, 'empty dashboard')
  await page.screenshot({ path: `${SHOTS}/01-empty.png` })

  console.log('\n— adding items —')
  await addItem(page, 'BPI Savings', 'liquid', '620000', 'Emergency fund')
  await addItem(page, 'Condo — Mandaluyong', 'physical', '8500000.10')
  await addItem(page, 'Condo mortgage', 'liab', '5240000')

  const body = await page.locator('body').innerText()
  check('net worth is exact (₱3,880,000)', body.includes('3,880,000'), body.slice(0, 120))
  await assertNoBadNumbers(page, 'dashboard with data')
  await page.screenshot({ path: `${SHOTS}/02-dashboard.png` })

  console.log('\n— single-snapshot history state —')
  check(
    'no fabricated chart; honest copy instead',
    body.includes('History starts today')
  )

  console.log('\n— category drill-down —')
  await page.getByRole('button', { name: /Liabilities/ }).click()
  await page.waitForURL('**/category/liab', { timeout: 15000 })
  const catText = await page.locator('body').innerText()
  check('liability rendered negative', catText.includes('−₱5,240,000'))
  await assertNoBadNumbers(page, 'category page')
  await page.screenshot({ path: `${SHOTS}/03-category.png` })

  console.log('\n— edit —')
  await page.getByRole('button', { name: 'Edit' }).first().click()
  const editDialog = page.getByRole('dialog')
  await editDialog.waitFor({ state: 'visible' })
  await editDialog.locator('input[name="value"]').fill('5000000')
  await editDialog.locator('button[type="submit"]').click()
  await editDialog.waitFor({ state: 'hidden', timeout: 20000 })
  await page.waitForTimeout(900)
  check(
    'edited value persisted',
    (await page.locator('body').innerText()).includes('5,000,000')
  )

  console.log('\n— validation —')
  await page.getByRole('button', { name: /\+ Add item/ }).click()
  const badDialog = page.getByRole('dialog')
  await badDialog.waitFor({ state: 'visible' })
  await badDialog.locator('input[name="name"]').fill('Bad value')
  await badDialog.locator('input[name="value"]').fill('1.2.3')
  await badDialog.locator('button[type="submit"]').click()
  await page.waitForTimeout(1500)
  const stillOpen = await badDialog.isVisible()
  check('malformed amount rejected (dialog stays open)', stillOpen)
  const alertText = stillOpen
    ? await badDialog.getByRole('alert').innerText().catch(() => '')
    : ''
  check('a validation message is shown', alertText.length > 0, alertText)
  await page.keyboard.press('Escape')
  await badDialog.waitFor({ state: 'hidden' })

  console.log('\n— delete —')
  const beforeRows = await page.getByRole('button', { name: 'Delete' }).count()
  await page.getByRole('button', { name: 'Delete' }).first().click()
  await page.waitForTimeout(1500)
  const afterRows = await page.getByRole('button', { name: 'Delete' }).count()
  check('row removed', afterRows === beforeRows - 1, `${beforeRows} → ${afterRows}`)

  console.log('\n— history page —')
  await page.getByRole('link', { name: 'History' }).click()
  await page.waitForURL('**/history', { timeout: 15000 })
  await assertNoBadNumbers(page, 'history page')
  await page.screenshot({ path: `${SHOTS}/04-history.png` })

  console.log('\n— unknown category —')
  const resp = await page.goto(`${BASE}/category/nonsense`)
  check('unknown category returns 404', resp?.status() === 404, `${resp?.status()}`)

  console.log('\n— theme —')
  await page.goto(`${BASE}/dashboard`)
  await page.locator('button[title*="Switch to"]').click()
  await page.waitForTimeout(400)
  const themeAttr = await page.locator('html').getAttribute('data-nw-theme')
  check('theme toggles to dark', themeAttr === 'dark', String(themeAttr))
  await page.screenshot({ path: `${SHOTS}/05-dark.png` })

  await page.reload()
  await page.waitForTimeout(500)
  check(
    'theme persists across reload',
    (await page.locator('html').getAttribute('data-nw-theme')) === 'dark'
  )

  console.log('\n— sign out —')
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.waitForURL('**/login', { timeout: 15000 })
  check('sign out returns to login', page.url().includes('/login'))

  await page.goto(`${BASE}/dashboard`)
  await page.waitForURL('**/login**', { timeout: 15000 })
  check('dashboard blocked after sign out', page.url().includes('/login'))

  await browser.close()

  // Clean up the test account.
  const { data: list } = await admin.auth.admin.listUsers()
  const u = list?.users.find((x) => x.email === EMAIL)
  if (u) await admin.auth.admin.deleteUser(u.id)

  console.log(
    failures ? `\n${failures} CHECK(S) FAILED` : '\nall browser checks passed'
  )
  process.exit(failures ? 1 : 0)
}

main().catch((e) => {
  console.error('\nerror:', e.message)
  process.exit(1)
})
