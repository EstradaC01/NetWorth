import { parseAmount, fmt, short, centsToInput, pctChange } from '../lib/money.ts'
import { extent, path, xAt } from '../lib/chart.ts'
import { currentMonthKey, monthsBetween } from '../lib/dates.ts'

let fail = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) fail++
  console.log((ok ? '  ok  ' : 'FAIL  ') + label + '  got=' + JSON.stringify(got) + (ok ? '' : ' want=' + JSON.stringify(want)))
}

console.log('-- money: precision --')
eq('8500000.10 -> exact cents', parseAmount('8500000.10'), { ok: true, cents: 850000010 })
eq('620000 plain',              parseAmount('620000'),      { ok: true, cents: 62000000 })
eq('with separators',           parseAmount('₱1,240,000'),  { ok: true, cents: 124000000 })

console.log('-- money: prototype silently coerced these --')
eq('1-2-3 rejected',    parseAmount('1-2-3').ok,  false)
eq('1.2.3 rejected',    parseAmount('1.2.3').ok,  false)
eq('negative rejected', parseAmount('-500').ok,   false)
eq('3 decimals reject', parseAmount('10.123').ok, false)
eq('empty rejected',    parseAmount('').ok,       false)
eq('abc rejected',      parseAmount('abc').ok,    false)

console.log('-- money: formatting --')
eq('fmt',         fmt(62000000),           '₱620,000')
eq('short M',     short(850000010),        '₱8.50M')
eq('short k',     short(62000000),         '₱620k')
eq('roundtrip',   centsToInput(850000010), '8500000.10')
eq('pct no base', pctChange(0, 100),       '—')
eq('pct up',      pctChange(1000, 1124),   '+12.4%')

console.log('-- chart: the NaN cases --')
eq('extent empty', extent([]), { lo: 0, hi: 1 })
eq('path empty',   path([], 1000, 300, 0, 1, 18), '')
const p1 = path([500], 1000, 300, 0, 1000, 18)
eq('path 1pt no NaN', /NaN|Infinity/.test(p1), false)
console.log('       single point ->', p1)
const e = extent([100, 500])
eq('path n no NaN', /NaN|Infinity/.test(path([100,300,500], 1000, 300, e.lo, e.hi, 18)), false)
const f = extent([7,7,7])
eq('flat line ok',  /NaN|Infinity/.test(path([7,7,7], 1000, 300, f.lo, f.hi, 18)), false)
eq('xAt single',    xAt(0, 1, 1000), 500)

console.log('-- dates --')
eq('Manila rollover', currentMonthKey(new Date('2026-08-31T23:30:00Z')), '2026-09-01')
eq('monthsBetween',   monthsBetween('2025-08-01','2026-08-01'), 12)

console.log(fail ? `\n${fail} FAILED` : '\nall passed')
process.exit(fail ? 1 : 0)
