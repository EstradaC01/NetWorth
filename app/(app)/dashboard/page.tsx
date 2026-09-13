import { redirect } from 'next/navigation'
import {
  getGoals,
  getItems,
  getSnapshots,
  recordCurrentSnapshot,
  requireUser,
} from '@/lib/data'
import { Dashboard } from './dashboard'

export const metadata = { title: 'Dashboard · NetWorth' }

export default async function DashboardPage() {
  const user = await requireUser()
  if (!user) redirect('/login')

  const items = await getItems()

  // Capture this month even if the user changed nothing — otherwise a month
  // in which they only looked would leave a gap in their history.
  if (items.length > 0) await recordCurrentSnapshot(user.id, items)

  // After the snapshot write, so the chart includes the reading just taken.
  const [snapshots, goals] = await Promise.all([getSnapshots(), getGoals()])

  return <Dashboard items={items} snapshots={snapshots} goals={goals} />
}
