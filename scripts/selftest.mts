import { parseAmount, fmt, short, centsToInput, pctChange } from '../lib/money.ts'
import { extent, path, xAt } from '../lib/chart.ts'
import { currentMonthKey, monthsBetween, formatMonthLabel, formatTargetMonth } from '../lib/dates.ts'
import { addMonths, goalProgress, monthlyRate, paceVerdict, projectArrival } from '../lib/goals.ts'
import { toCsv, csvAmount } from '../lib/csv.ts'
import { concentration, leverage, biggestMover } from '../lib/insights.ts'
import { eventDelta } from '../lib/types.ts'

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
// A goal deadline must not read as a day of the month: "Dec 28" is ambiguous
// where "Dec 2028" is not.
eq('chart label stays short', formatMonthLabel('2028-12-01'),  'Dec 28')
eq('target month is explicit', formatTargetMonth('2028-12-01'), 'Dec 2028')

// ── goals ────────────────────────────────────────────────────────────────

const snap = (month: string, net: number) => ({
  month, liquid_cents: net, invest_cents: 0, physical_cents: 0, liab_cents: 0,
})

console.log('-- goals: progress is measured from the first reading --')
// Started at 2M, target 5M, now at 3M -> a third of the way, not 60%.
eq('progress from start', goalProgress(300, 500, 200), 1/3)
eq('progress clamps low',  goalProgress(100, 500, 200), 0)
eq('progress clamps high', goalProgress(900, 500, 200), 1)
eq('zero span, reached',   goalProgress(500, 500, 500), 1)
eq('zero span, short',     goalProgress(400, 500, 500), 0)

console.log('-- goals: rate uses calendar months, so gaps dilute it --')
eq('rate over 2 months', monthlyRate([snap('2026-01-01', 0), snap('2026-03-01', 200)]), 100)
eq('rate needs 2 points', monthlyRate([snap('2026-01-01', 0)]), null)
eq('rate same month',     monthlyRate([snap('2026-01-01', 0), snap('2026-01-01', 5)]), null)

console.log('-- goals: projection refuses to guess --')
eq('flat rate -> null',     projectArrival(100, 500, 0, '2026-01-01'), null)
eq('wrong direction',       projectArrival(100, 500, -10, '2026-01-01'), null)
eq('no rate',               projectArrival(100, 500, null, '2026-01-01'), null)
eq('absurd horizon capped', projectArrival(0, 1_000_000, 1, '2026-01-01'), null)
eq('reached already',       projectArrival(600, 500, 10, '2026-01-01'), { months: 0, month: '2026-01-01' })
eq('arrives in 4',          projectArrival(100, 500, 100, '2026-01-01'), { months: 4, month: '2026-05-01' })

console.log('-- goals: addMonths rolls the year --')
eq('addMonths across year', addMonths('2026-11-01', 3), '2027-02-01')
eq('addMonths zero',        addMonths('2026-11-01', 0), '2026-11-01')
eq('addMonths backwards',   addMonths('2026-02-01', -3), '2025-11-01')

console.log('-- goals: pace --')
const proj = projectArrival(100, 500, 100, '2026-01-01') // 4 months -> May
eq('ahead of deadline', paceVerdict(proj, '2026-08-15', '2026-01-01'), 'ahead')
eq('behind deadline',   paceVerdict(proj, '2026-03-15', '2026-01-01'), 'behind')
eq('no deadline',       paceVerdict(proj, null, '2026-01-01'), null)
eq('no projection',     paceVerdict(null, '2026-08-15', '2026-01-01'), null)

// ── csv ──────────────────────────────────────────────────────────────────

console.log('-- csv: injection and quoting --')
eq('formula = neutralised', toCsv(['a'], [['=1+1']]).includes("'=1+1"), true)
eq('formula + neutralised', toCsv(['a'], [['+cmd']]).includes("'+cmd"), true)
eq('formula @ neutralised', toCsv(['a'], [['@x']]).includes("'@x"), true)
eq('comma quoted',   toCsv(['a'], [['Condo, Makati']]), 'a\r\n"Condo, Makati"\r\n')
eq('quote doubled',  toCsv(['a'], [['He said "hi"']]), 'a\r\n"He said ""hi"""\r\n')
eq('newline quoted', toCsv(['a'], [['one\ntwo']]), 'a\r\n"one\ntwo"\r\n')
eq('null is empty',  toCsv(['a','b'], [[null, 'x']]), 'a,b\r\n,x\r\n')
// A negative amount starts with '-', which is also a formula lead. It must
// survive as a number a spreadsheet can sum, so csvAmount output is checked
// through toCsv to confirm the guard does not mangle it into text.
eq('csvAmount exact',    csvAmount(850000010), '8500000.10')
eq('csvAmount negative', csvAmount(-62000000), '-620000.00')
// A negative figure must stay a number the spreadsheet can sum: a user in net
// debt exports a whole column of them, and quoting would make the total fail.
eq('negative stays numeric', toCsv(['Net'], [[csvAmount(-62000000)]]), 'Net\r\n-620000.00\r\n')
eq('negative number as num', toCsv(['n'], [[-5]]), 'n\r\n-5\r\n')
// ...but a subtraction that only looks numeric is still neutralised.
eq('-1+1 still guarded', toCsv(['a'], [['-1+1']]).includes("'-1+1"), true)
eq('-cmd still guarded', toCsv(['a'], [['-2+3+cmd|x']]).includes("'-2+3+cmd|x"), true)

// ── insights ─────────────────────────────────────────────────────────────

const item = (cat: string, name: string, v: number) => ({
  id: name, cat, name, value_cents: v, notes: null,
  created_at: '2026-01-01', updated_at: '2026-01-01',
}) as never

console.log('-- insights: refuse to speak without data --')
eq('concentration needs 2', concentration([item('liquid','a',100)]), null)
eq('concentration pct', concentration([item('liquid','a',300), item('invest','b',100)])?.value, '75%')
eq('leverage no debt',  leverage([item('liquid','a',100)])?.value, '0%')
eq('leverage 50%',      leverage([item('liquid','a',200), item('liab','d',100)])?.value, '50%')
eq('mover needs 2 snaps', biggestMover([snap('2026-01-01', 100)]), null)

console.log('-- insights: rising debt reads as bad, rising assets as good --')
const liabRose = [
  { month: '2026-01-01', liquid_cents: 0, invest_cents: 0, physical_cents: 0, liab_cents: 0 },
  { month: '2026-02-01', liquid_cents: 0, invest_cents: 0, physical_cents: 0, liab_cents: 50000 },
]
eq('debt up is bad', biggestMover(liabRose)?.tone, 'bad')

console.log('-- events: a liability rising lowers net worth --')
const ev = (cat: string, before: number|null, after: number|null) => ({
  id:'e', item_id:'i', kind:'edit', cat, item_name:'x',
  before_cents: before, after_cents: after, created_at:'2026-01-01',
}) as never
eq('asset up   -> +', eventDelta(ev('liquid', 100, 300)),  200)
eq('debt up    -> −', eventDelta(ev('liab',   100, 300)), -200)
eq('debt paid  -> +', eventDelta(ev('liab',   300, 100)),  200)
eq('add asset  -> +', eventDelta(ev('invest', null, 500)), 500)
eq('del asset  -> −', eventDelta(ev('invest', 500, null)), -500)
eq('del debt   -> +', eventDelta(ev('liab',   500, null)), 500)

console.log(fail ? `\n${fail} FAILED` : '\nall passed')
process.exit(fail ? 1 : 0)
