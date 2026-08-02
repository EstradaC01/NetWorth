import { redirect } from 'next/navigation'
import { getGoal, getItems, getSnapshots, requireUser } from '@/lib/data'
import { GoalView } from './goal-view'

export const metadata = { title: 'Goal · NetWorth' }

export default async function GoalPage() {
  const user = await requireUser()
  if (!user) redirect('/login')

  // No snapshot is recorded here. Unlike the dashboard, visiting this page is
  // not a reading of the portfolio — it is where the target is set, and
  // writing a snapshot on load would let a user create a month's history by
  // editing their goal rather than by holding assets.
  const [goal, items, snapshots] = await Promise.all([
    getGoal(),
    getItems(),
    getSnapshots(),
  ])

  return <GoalView goal={goal} items={items} snapshots={snapshots} />
}
