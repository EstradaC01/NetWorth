/**
 * Goal progress and trend projection.
 *
 * The governing rule from the rest of this codebase applies here too: nothing
 * is fabricated. A projection is an extrapolation of readings the user
 * actually recorded, and every function below refuses to answer rather than
 * guess when the data cannot support one. `null` means "not enough history",
 * and callers render that as prose instead of a number.
 */

import { monthsBetween } from './dates'
import { totalsFromSnapshot, type Snapshot } from './types'

export type Goal = {
  target_cents: number
  target_date: string | null // 'YYYY-MM-DD'
  note: string | null
}

/**
 * Fraction of the way from a starting point to the target, clamped to 0..1.
 *
 * The start is the user's earliest recorded net worth, not zero. Someone who
 * began tracking at ₱2M with a ₱5M target has covered a third of the distance
 * at ₱3M — measuring from zero would credit them 60% for ground they never
 * walked. When there is no history to anchor to, zero is the honest start.
 */
export function goalProgress(
  current: number,
  target: number,
  start: number
): number {
  const span = target - start
  // Target equals start: either already there, or an unmovable goal. Treat
  // reaching or passing it as complete, anything short of it as not started.
  if (span === 0) return current >= target ? 1 : 0
  const frac = (current - start) / span
  if (!Number.isFinite(frac)) return 0
  return Math.max(0, Math.min(1, frac))
}

/**
 * Average net-worth change per month across the recorded window.
 *
 * A plain endpoint-to-endpoint slope, not a regression: the series is monthly
 * and short (a user with two years of history has 24 points), and a least-
 * squares fit over that reads as more authority than the data carries. The
 * span is measured in calendar months between the keys, so a gap month — one
 * where the user never opened the app — correctly dilutes the rate rather
 * than being counted as a full step.
 */
export function monthlyRate(snapshots: Snapshot[]): number | null {
  if (snapshots.length < 2) return null
  const first = snapshots[0]
  const last = snapshots[snapshots.length - 1]
  const months = monthsBetween(first.month, last.month)
  if (months <= 0) return null
  const from = totalsFromSnapshot(first).net
  const to = totalsFromSnapshot(last).net
  return (to - from) / months
}

export type Projection = {
  /** Whole months until the target is reached at the current rate. */
  months: number
  /** The month key ('YYYY-MM-01') that lands on. */
  month: string
}

/**
 * When the current trend reaches the target, or null if it never does.
 *
 * Returns null when the rate is flat or moving away from the goal — an
 * "arrives in 4,000 months" figure is technically an answer and practically
 * noise. Also caps at 50 years: past that the extrapolation says nothing
 * useful about a monthly savings habit.
 */
export function projectArrival(
  current: number,
  target: number,
  rate: number | null,
  fromMonth: string
): Projection | null {
  if (rate === null || rate === 0) return null
  if (current >= target && rate > 0) return { months: 0, month: fromMonth }

  const remaining = target - current
  // Moving the wrong way: shrinking when the goal is above, or growing when
  // the goal is below (a debt-reduction target already met and reversing).
  if (Math.sign(remaining) !== Math.sign(rate)) return null

  const months = Math.ceil(remaining / rate)
  if (!Number.isFinite(months) || months <= 0) return null
  if (months > 600) return null

  return { months, month: addMonths(fromMonth, months) }
}

/** Advances a 'YYYY-MM-01' key by n months, staying pinned to the 1st. */
export function addMonths(monthKey: string, n: number): string {
  const [y, m] = monthKey.split('-').map(Number)
  // Work in a zero-based absolute month count so negative n and year
  // rollovers both fall out of the arithmetic instead of needing branches.
  const abs = y * 12 + (m - 1) + n
  const year = Math.floor(abs / 12)
  const month = abs - year * 12 + 1
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`
}

/**
 * Whether the current pace makes the deadline, when there is one.
 *
 * Undefined-by-omission is meaningful here: null means the question cannot be
 * answered (no deadline, or no trend), which the UI must distinguish from a
 * confident "behind schedule".
 */
export function paceVerdict(
  projection: Projection | null,
  targetDate: string | null,
  fromMonth: string
): 'ahead' | 'behind' | null {
  if (!projection || !targetDate) return null
  // The deadline's own month is the last one that counts as on time.
  const deadlineMonth = targetDate.slice(0, 7) + '-01'
  const monthsAvailable = monthsBetween(fromMonth, deadlineMonth)
  return projection.months <= monthsAvailable ? 'ahead' : 'behind'
}
