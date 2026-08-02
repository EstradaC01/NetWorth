/**
 * All user-facing dates are rendered in Asia/Manila, not the server's zone.
 *
 * This matters for more than cosmetics: a snapshot month is keyed by calendar
 * month, and a Manila user acting at 07:00 on the 1st is still 23:00 on the
 * previous day in UTC. Keying off UTC would file that snapshot in the wrong
 * month.
 */

export const TZ = 'Asia/Manila'

const DAY_MONTH_YEAR = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  day: '2-digit',
  month: 'short',
  year: '2-digit',
})

const MONTH_YEAR = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  month: 'short',
  year: '2-digit',
})

const LONG_DATE = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** `02 Aug 26` — the format the prototype hard-coded on every item row. */
export function formatItemDate(iso: string | Date): string {
  return DAY_MONTH_YEAR.format(new Date(iso))
}

/** `Aug 26` — chart axis labels. */
export function formatMonthLabel(iso: string | Date): string {
  // A bare 'YYYY-MM-DD' from Postgres parses as UTC midnight; formatting that
  // in Manila (UTC+8) stays within the same day, so the month is correct.
  return MONTH_YEAR.format(new Date(iso))
}

const MONTH_FULL_YEAR = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  month: 'short',
  year: 'numeric',
})

/**
 * `Dec 2028` — goal deadlines.
 *
 * Deliberately not `formatMonthLabel`'s two-digit year: "Dec 28" reads as the
 * 28th of December at least as readily as December 2028, and a goal date is
 * exactly where that confusion costs the user something.
 */
export function formatTargetMonth(iso: string | Date): string {
  return MONTH_FULL_YEAR.format(new Date(iso))
}

/** `2 August 2026` — the dashboard's "as of" line. */
export function formatLongDate(iso: string | Date): string {
  return LONG_DATE.format(new Date(iso))
}

/**
 * The current month in Manila, pinned to the 1st, as 'YYYY-MM-01'.
 * This is the primary key component for a snapshot row.
 */
export function currentMonthKey(now: Date = new Date()): string {
  // en-CA renders ISO-style YYYY-MM-DD, which makes the slice below safe.
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  return `${ymd.slice(0, 7)}-01`
}

/** Months between two 'YYYY-MM-01' keys — used to find a 12-month baseline. */
export function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm)
}
