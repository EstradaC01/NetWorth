/**
 * CSV serialisation for the export endpoints.
 *
 * Two hazards drive the escaping below, and both are reachable from ordinary
 * user input in this app:
 *
 * 1. RFC 4180 quoting. An item named `Condo, Makati` or a note containing a
 *    line break would otherwise shift every later column on that row.
 *
 * 2. Formula injection. Excel, Sheets and LibreOffice all evaluate a cell
 *    whose text begins with `=`, `+`, `-` or `@` when the file is opened. An
 *    item named `=HYPERLINK("http://evil","Click")` is a plausible thing for
 *    an attacker to talk a user into pasting, and quoting alone does not stop
 *    it — the guard has to change what the cell starts with.
 */

/** Characters that make a spreadsheet treat the cell as a formula. */
const FORMULA_LEAD = /^[=+\-@\t\r]/

/**
 * A plain decimal number, optionally signed.
 *
 * Exempted from the formula guard below. Without this, every negative figure
 * — a net worth in debt, a downward change — would be prefixed and land in
 * the spreadsheet as text, so the column the user most wants to total would
 * not sum. `-620000.00` cannot express a formula, so quoting it buys nothing.
 */
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  let s = String(value)

  // Prefix with a single quote so the cell reads as literal text. Done before
  // quoting so the apostrophe ends up inside the quoted run.
  if (FORMULA_LEAD.test(s) && !PLAIN_NUMBER.test(s)) s = "'" + s

  // Quote whenever the cell could otherwise break the row, doubling any
  // embedded quotes as the RFC requires.
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

/**
 * Builds a CSV document from a header row and body rows.
 *
 * CRLF line endings, per RFC 4180 — Excel on Windows is the dominant consumer
 * and is the least forgiving about bare LF.
 */
export function toCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): string {
  const lines = [headers.map(escapeCell).join(',')]
  for (const row of rows) lines.push(row.map(escapeCell).join(','))
  return lines.join('\r\n') + '\r\n'
}

/**
 * Money for a spreadsheet: a plain decimal string, not the display format.
 *
 * `₱620,000` is a string to Excel; `620000.00` is a number it can sum. The
 * currency belongs in the column header instead.
 */
export function csvAmount(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const frac = abs % 100
  const whole = (abs - frac) / 100
  return `${sign}${whole}.${String(frac).padStart(2, '0')}`
}

/**
 * A filename-safe timestamp, computed in the caller's chosen month key so the
 * export is dated in Manila like everything else the user sees.
 */
export function exportFilename(prefix: string, monthKey: string): string {
  return `networth-${prefix}-${monthKey.slice(0, 7)}.csv`
}
