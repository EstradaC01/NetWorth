'use client'

import { useTheme } from '@/components/theme'
import { PALETTE } from '@/lib/categories'
import { formatTargetMonth } from '@/lib/dates'
import { allocationProgress, type Goal } from '@/lib/goals'
import { fmt } from '@/lib/money'

export function GoalProgress({ goal, compact = false }: { goal: Goal; compact?: boolean }) {
  const { theme } = useTheme()
  const P = PALETTE[theme]
  const fraction = allocationProgress(goal)
  const reached = fraction >= 1
  return <div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
      <div style={{ fontSize: compact ? 13 : 16, fontWeight: 600 }}>{goal.name}</div>
      {goal.target_date && <div style={{ fontSize: 13, color: 'var(--nw-muted)' }}>by {formatTargetMonth(goal.target_date)}</div>}
      <div style={{ marginLeft: 'auto', fontSize: compact ? 13 : 15, color: reached ? P.pos : 'var(--nw-fg)' }}>{Math.round(fraction * 100)}%</div>
    </div>
    <div role="progressbar" aria-label={`Allocation progress for ${goal.name}`} aria-valuenow={Math.round(fraction * 100)} aria-valuemin={0} aria-valuemax={100} style={{ marginTop: 10, height: 8, borderRadius: 999, border: '1px solid var(--nw-line)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${fraction * 100}%`, background: reached ? P.pos : P.invest, transition: 'width .35s ease' }} />
    </div>
    <div style={{ marginTop: 8, fontSize: compact ? 12 : 14, color: 'var(--nw-muted)' }}>
      {fmt(goal.allocated_cents)} allocated of {fmt(goal.target_cents)}{reached ? ' — fully funded.' : ` · ${fmt(goal.target_cents - goal.allocated_cents)} left to assign.`}
    </div>
  </div>
}
