/** The four buckets. `liab` is stored positive and subtracted in every total. */
export const CATEGORY_IDS = ['liquid', 'invest', 'physical', 'liab'] as const

export type CategoryId = (typeof CATEGORY_IDS)[number]

export type Category = {
  id: CategoryId
  name: string
  /** True for the three asset buckets; false for liabilities. */
  asset: boolean
}

export const CATS: Category[] = [
  { id: 'liquid', name: 'Liquid Cash', asset: true },
  { id: 'invest', name: 'Investments', asset: true },
  { id: 'physical', name: 'Physical Assets', asset: true },
  { id: 'liab', name: 'Liabilities', asset: false },
]

export const ASSET_CATS = CATS.filter((c) => c.asset)

export function isCategoryId(v: string): v is CategoryId {
  return (CATEGORY_IDS as readonly string[]).includes(v)
}

export function categoryById(id: CategoryId): Category {
  // Safe: `id` is narrowed to a known member of CATS.
  return CATS.find((c) => c.id === id)!
}

/**
 * Chart and accent colours per theme, lifted verbatim from the prototype so
 * the ported design matches pixel for pixel.
 */
export const PALETTE = {
  light: {
    liquid: '#62c5ee',
    invest: '#0088b0',
    physical: '#edbb00',
    liab: '#d6006c',
    net: '#201e1d',
    hair: 'rgba(32,30,29,.10)',
    line: 'rgba(32,30,29,.32)',
    pos: '#006786',
    neg: '#aa0b56',
  },
  dark: {
    liquid: '#99e0ff',
    invest: '#38a6cf',
    physical: '#edbb00',
    liab: '#ff458e',
    net: '#f3f2f2',
    hair: 'rgba(243,242,242,.09)',
    line: 'rgba(243,242,242,.30)',
    pos: '#62c5ee',
    neg: '#ff90b1',
  },
} as const

export type ThemeName = keyof typeof PALETTE
export type Palette = (typeof PALETTE)[ThemeName]
