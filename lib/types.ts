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
