import { NextRequest } from 'next/server'
import { getAllItemEvents, getGoal, getItems, getSnapshots, requireUser } from '@/lib/data'
import { categoryById } from '@/lib/categories'
import { csvAmount, exportFilename, toCsv } from '@/lib/csv'
import { currentMonthKey } from '@/lib/dates'
import { totalsFromSnapshot } from '@/lib/types'

/**
 * CSV export of the caller's own data.
 *
 * A GET is correct here despite the app's rule that mutations use POST: this
 * reads and changes nothing. It must never be cached, though — a shared cache
 * entry keyed by URL would hand one user's portfolio to the next, so the
 * segment is forced dynamic and the response carries no-store.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const user = await requireUser()
  // A 401 rather than a redirect: this endpoint is fetched directly by the
  // browser's download machinery, which has no useful way to follow one.
  if (!user) return new Response('Not signed in.', { status: 401 })

  const kind = request.nextUrl.searchParams.get('kind') ?? 'items'
  const month = currentMonthKey()

  if (kind === 'backup') {
    const [items, snapshots, events, goal] = await Promise.all([getItems(), getSnapshots(), getAllItemEvents(), getGoal()])
    // Use the same portable schema as a local backup: this makes an account
    // export genuinely restorable into either storage mode.
    const body = JSON.stringify({ format: 'networth-backup', version: 1, exportedAt: new Date().toISOString(), data: { items, snapshots, events, goal } }, null, 2)
    return new Response(body, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="networth-cloud-backup-${month.slice(0, 7)}.json"`, 'Cache-Control': 'no-store, private' } })
  }

  let csv: string
  let name: string

  if (kind === 'history') {
    const snapshots = await getSnapshots()
    csv = toCsv(
      ['Month', 'Liquid (PHP)', 'Investments (PHP)', 'Physical (PHP)', 'Liabilities (PHP)', 'Net worth (PHP)'],
      snapshots.map((s) => {
        const t = totalsFromSnapshot(s)
        return [
          s.month.slice(0, 7),
          csvAmount(t.liquid),
          csvAmount(t.invest),
          csvAmount(t.physical),
          csvAmount(t.liab),
          csvAmount(t.net),
        ]
      })
    )
    name = exportFilename('history', month)
  } else {
    const items = await getItems()
    csv = toCsv(
      ['Name', 'Category', 'Value (PHP)', 'Notes', 'Added', 'Updated'],
      items.map((i) => [
        i.name,
        categoryById(i.cat).name,
        csvAmount(i.value_cents),
        i.notes ?? '',
        i.created_at,
        i.updated_at,
      ])
    )
    name = exportFilename('items', month)
  }

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      // The filename is built from a fixed prefix and a month key, so it
      // needs no escaping — but it is quoted anyway to keep it that way if
      // the prefix ever becomes dynamic.
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store, private',
    },
  })
}
