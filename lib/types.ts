import type { CategoryId } from './categories'

export type Item = {
  id: string
  cat: CategoryId
  name: string
  value_cents: number
  notes: string | null
  created_at: string
  updated_at: string
}

export type Snapshot = {
  month: string // 'YYYY-MM-01'
  liquid_cents: number
  invest_cents: number
  physical_cents: number
  liab_cents: number
}

export type ItemEventKind = 'add' | 'edit' | 'delete'

/**
 * One entry in the append-only activity log. `before_cents` is null on an
 * add and `after_cents` is null on a delete — the nulls carry meaning, so
 * neither is defaulted to zero.
 */
export type ItemEvent = {
  id: string
  item_id: string
  kind: ItemEventKind
  cat: CategoryId
  item_name: string
  before_cents: number | null
  after_cents: number | null
  created_at: string
}

/**
 * The signed effect of an event on net worth.
 *
 * The nulls coalesce to zero here and only here: on an add there was nothing
 * before, and on a delete there is nothing after, so zero is the arithmetically
 * correct stand-in for that side of the subtraction — unlike in display code,
 * where a null must stay visible as "—".
 */
export function eventDelta(e: ItemEvent): number {
  const change = (e.after_cents ?? 0) - (e.before_cents ?? 0)
  // A liability growing by ₱100 moves net worth down by ₱100.
  return e.cat === 'liab' ? -change : change
}

/** Category totals in centavos, plus the derived asset/net figures. */
export type Totals = {
  liquid: number
  invest: number
  physical: number
  liab: number
  assets: number
  net: number
}

export function totalsFrom(items: Item[]): Totals {
  const t = { liquid: 0, invest: 0, physical: 0, liab: 0 }
  for (const i of items) t[i.cat] += i.value_cents
  const assets = t.liquid + t.invest + t.physical
  return { ...t, assets, net: assets - t.liab }
}

export function totalsFromSnapshot(s: Snapshot): Totals {
  const assets = s.liquid_cents + s.invest_cents + s.physical_cents
  return {
    liquid: s.liquid_cents,
    invest: s.invest_cents,
    physical: s.physical_cents,
    liab: s.liab_cents,
    assets,
    net: assets - s.liab_cents,
  }
}
