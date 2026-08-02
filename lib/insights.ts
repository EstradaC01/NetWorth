/**
 * Derived observations about a portfolio.
 *
 * Every insight here is arithmetic over rows the user entered or readings
 * they recorded — none is advice, and none invents a figure. Each generator
 * returns null when its precondition fails, so the dashboard shows three
 * honest cards rather than five with two padded out.
 *
 * The tone target is a statement of fact the user can verify by looking at
 * their own list ("Property is 61% of your assets"), never a recommendation
 * ("you should diversify"). This is a tracker, not an adviser, and it has no
 * knowledge of the user's circumstances.
 */

import { categoryById, CATS, type CategoryId } from './categories'
import { fmt, short } from './money'
import { formatMonthLabel } from './dates'
import { totalsFrom, totalsFromSnapshot, type Item, type Snapshot } from './types'

export type Insight = {
  /** Stable key for React and for tests. */
  id: string
  /** Short uppercase label, e.g. 'CONCENTRATION'. */
  label: string
  /** The headline figure, already formatted. */
  value: string
  /** One sentence of plain-language context. */
  detail: string
  /** Drives the accent colour; 'neutral' when there is no good/bad reading. */
  tone: 'good' | 'bad' | 'neutral'
}

/**
 * The single largest item as a share of total assets.
 *
 * Liabilities are excluded: "your mortgage is 70% of your assets" conflates
 * two different quantities, and debt concentration is covered by the leverage
 * insight below.
 */
export function concentration(items: Item[]): Insight | null {
  const assets = items.filter((i) => i.cat !== 'liab')
  if (assets.length < 2) return null // A single item is trivially 100%.

  const t = totalsFrom(items)
  if (t.assets <= 0) return null

  const biggest = assets.reduce((a, b) =>
    b.value_cents > a.value_cents ? b : a
  )
  const pct = (biggest.value_cents / t.assets) * 100

  return {
    id: 'concentration',
    label: 'Largest holding',
    value: `${pct.toFixed(0)}%`,
    detail: `${biggest.name} is ${pct.toFixed(0)}% of your ${fmt(t.assets)} in assets.`,
    // Always neutral. A high share is a fact about the portfolio's shape, not
    // a mistake — the user may hold one house on purpose, and this app knows
    // nothing about their circumstances that would justify calling it bad.
    tone: 'neutral',
  }
}

/** Debt as a percentage of assets. */
export function leverage(items: Item[]): Insight | null {
  const t = totalsFrom(items)
  if (t.assets <= 0) return null
  if (t.liab === 0) {
    return {
      id: 'leverage',
      label: 'Debt ratio',
      value: '0%',
      detail: 'You have no liabilities recorded.',
      tone: 'good',
    }
  }
  const pct = (t.liab / t.assets) * 100
  return {
    id: 'leverage',
    label: 'Debt ratio',
    value: `${pct.toFixed(0)}%`,
    detail: `${fmt(t.liab)} owed against ${fmt(t.assets)} in assets.`,
    tone: pct >= 100 ? 'bad' : pct <= 35 ? 'good' : 'neutral',
  }
}

/**
 * Liquid cash expressed as a multiple of average monthly spending — except
 * this app records no spending, so it cannot honestly say "months of expenses".
 *
 * Instead it reports liquid cash as a share of total assets, which is a
 * question the data can actually answer.
 */
export function liquidity(items: Item[]): Insight | null {
  const t = totalsFrom(items)
  if (t.assets <= 0) return null
  const pct = (t.liquid / t.assets) * 100
  return {
    id: 'liquidity',
    label: 'In cash',
    value: `${pct.toFixed(0)}%`,
    detail: `${fmt(t.liquid)} of your assets is liquid.`,
    tone: 'neutral',
  }
}

/**
 * The category that moved most since the previous recorded month.
 *
 * Compares the last two snapshots, which are consecutive readings but not
 * necessarily consecutive months — the label names the month it compares
 * against so the user is never misled about the window.
 */
export function biggestMover(snapshots: Snapshot[]): Insight | null {
  if (snapshots.length < 2) return null
  const prev = totalsFromSnapshot(snapshots[snapshots.length - 2])
  const curr = totalsFromSnapshot(snapshots[snapshots.length - 1])

  let best: { cat: CategoryId; diff: number } | null = null
  for (const c of CATS) {
    const diff = curr[c.id] - prev[c.id]
    if (best === null || Math.abs(diff) > Math.abs(best.diff)) {
      best = { cat: c.id, diff }
    }
  }
  if (!best || best.diff === 0) return null

  const name = categoryById(best.cat).name
  const up = best.diff > 0
  // Rising debt is the bad direction; rising assets is the good one.
  const good = best.cat === 'liab' ? !up : up

  return {
    id: 'mover',
    label: 'Biggest move',
    value: (up ? '+' : '−') + short(best.diff),
    detail: `${name}, since ${formatMonthLabel(snapshots[snapshots.length - 2].month)}.`,
    tone: good ? 'good' : 'bad',
  }
}

/** The user's best recorded net worth, and whether they are at it now. */
export function peak(snapshots: Snapshot[]): Insight | null {
  if (snapshots.length < 2) return null
  const nets = snapshots.map((s) => ({
    month: s.month,
    net: totalsFromSnapshot(s).net,
  }))
  const best = nets.reduce((a, b) => (b.net > a.net ? b : a))
  const current = nets[nets.length - 1]

  if (best.month === current.month) {
    return {
      id: 'peak',
      label: 'Peak',
      value: short(current.net),
      detail: 'This is the highest your net worth has been recorded.',
      tone: 'good',
    }
  }

  const below = best.net - current.net
  return {
    id: 'peak',
    label: 'Peak',
    value: short(best.net),
    detail: `Recorded ${formatMonthLabel(best.month)}. You are ${short(below)} below it.`,
    tone: 'neutral',
  }
}

/**
 * Assembles the insight strip.
 *
 * Order is fixed rather than ranked by interestingness: the cards sit in the
 * same place every visit, so a returning user reads position rather than
 * re-reading labels. Nulls are dropped, so the strip shrinks on a thin
 * portfolio instead of showing placeholders.
 */
export function buildInsights(items: Item[], snapshots: Snapshot[]): Insight[] {
  return [
    biggestMover(snapshots),
    concentration(items),
    leverage(items),
    liquidity(items),
    peak(snapshots),
  ].filter((i): i is Insight => i !== null)
}
