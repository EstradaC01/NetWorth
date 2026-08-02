/**
 * Money is stored and passed around as an integer number of centavos, never
 * as a float. `parseFloat("8500000.10") * 100` is not reliably an integer,
 * and summing floats across a portfolio accumulates error into a figure the
 * user reads as exact.
 *
 * A JS number holds centavos exactly up to 2^53, i.e. about ₱90 trillion, so
 * plain `number` is safe here — no BigInt needed on the client.
 */

/**
 * Hoisted, not constructed per call: `fmt` runs ~100× per render, and an
 * explicit locale keeps server and client output identical (a mismatch is a
 * hydration error).
 *
 * Deliberately 'en-US', not 'en-PH': the design specifies ₱620,000 grouping.
 */
const GROUPED = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

const PESO = '₱' // ₱ U+20B1

/** `₱620,000` — absolute value; callers add their own sign. */
export function fmt(cents: number): string {
  return PESO + GROUPED.format(Math.round(Math.abs(cents) / 100))
}

/** Compact form for axis labels and the history table: `₱8.50M`, `₱620k`. */
export function short(cents: number): string {
  const pesos = Math.abs(cents) / 100
  if (pesos >= 1_000_000) return PESO + (pesos / 1_000_000).toFixed(2) + 'M'
  if (pesos >= 1_000) return PESO + Math.round(pesos / 1_000) + 'k'
  return PESO + Math.round(pesos)
}

export type ParseResult =
  | { ok: true; cents: number }
  | { ok: false; error: string }

/**
 * Parses user input into integer centavos.
 *
 * Strict where the prototype was permissive: its
 * `parseFloat(v.replace(/[^0-9.\-]/g, ''))` turned "1-2-3" into 1 and
 * "1.2.3" into 1.2 without complaint. For a value the user believes they
 * typed, silently keeping a prefix is worse than refusing it.
 *
 * Accepts thousands separators and spaces; rejects negatives (liabilities
 * are stored positive), more than one decimal point, and more than two
 * decimal places.
 */
export function parseAmount(input: string): ParseResult {
  const raw = String(input).trim()
  if (!raw) return { ok: false, error: 'Enter a value.' }

  // Strip grouping separators, currency symbol and whitespace — but nothing
  // else, so genuinely malformed input still fails below.
  const cleaned = raw.replace(/[,\s₱]/g, '')

  if (cleaned.startsWith('-'))
    return { ok: false, error: 'Value cannot be negative.' }

  if (!/^\d*(\.\d*)?$/.test(cleaned))
    return { ok: false, error: 'Enter a number, e.g. 620000 or 620000.50' }

  const [whole, frac = ''] = cleaned.split('.')
  if (frac.length > 2)
    return { ok: false, error: 'At most two decimal places.' }
  if (whole === '' && frac === '')
    return { ok: false, error: 'Enter a value.' }

  // Integer math only — no float multiplication anywhere on this path.
  const cents = Number(whole || '0') * 100 + Number(frac.padEnd(2, '0') || '0')

  if (!Number.isSafeInteger(cents))
    return { ok: false, error: 'That value is too large.' }

  return { ok: true, cents }
}

/** Centavos → the plain decimal string an edit form should show. */
export function centsToInput(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const frac = abs % 100
  const whole = (abs - frac) / 100
  return frac === 0
    ? `${sign}${whole}`
    : `${sign}${whole}.${String(frac).padStart(2, '0')}`
}

/** `+12.4%` / `−3.0%`, or `—` when there is no meaningful baseline. */
export function pctChange(from: number, to: number): string {
  if (from === 0) return '—'
  const pct = ((to - from) / Math.abs(from)) * 100
  if (!Number.isFinite(pct)) return '—'
  return (pct >= 0 ? '+' : '−') + Math.abs(pct).toFixed(1) + '%'
}
