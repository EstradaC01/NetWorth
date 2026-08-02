import { redirect } from 'next/navigation'
import { getItemEvents, getItems, getSnapshots, requireUser } from '@/lib/data'
import { HistoryView } from './history-view'

export const metadata = { title: 'History · NetWorth' }

export default async function HistoryPage() {
  const user = await requireUser()
  if (!user) redirect('/login')

  const [items, snapshots, events] = await Promise.all([
    getItems(),
    getSnapshots(),
    getItemEvents(),
  ])
  return <HistoryView items={items} snapshots={snapshots} events={events} />
}
