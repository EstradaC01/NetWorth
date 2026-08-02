import { redirect } from 'next/navigation'
import { getItems, getSnapshots, requireUser } from '@/lib/data'
import { HistoryView } from './history-view'

export const metadata = { title: 'History · NetWorth' }

export default async function HistoryPage() {
  const user = await requireUser()
  if (!user) redirect('/login')

  const [items, snapshots] = await Promise.all([getItems(), getSnapshots()])
  return <HistoryView items={items} snapshots={snapshots} />
}
