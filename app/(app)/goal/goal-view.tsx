'use client'

import { useActionState, useMemo, useState, useTransition } from 'react'
import { clearGoal, saveGoal, type GoalFormState } from '@/app/actions/goals'
import { GoalProgress } from '@/components/goal-progress'
import { allocatedTotal, type Goal } from '@/lib/goals'
import { centsToInput, fmt } from '@/lib/money'
import { totalsFrom, type Item } from '@/lib/types'

const initial: GoalFormState = { error: null }

export function GoalView({ goals, items }: { goals: Goal[]; items: Item[] }) {
  const [editing, setEditing] = useState<Goal | null>(null)
  const [result, formAction, pending] = useActionState(saveGoal, initial)
  const [removing, startRemoving] = useTransition()
  const totals = useMemo(() => totalsFrom(items), [items])
  const allocated = allocatedTotal(goals)
  const available = Math.max(0, totals.liquid - allocated)
  const selected = editing
  const remove = (id: string) => startRemoving(async () => { await clearGoal(id) })
  return <div className="nw-screen nw-goal" style={{ animation: 'nwIn .28s ease both', maxWidth: 720 }}>
    <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--nw-faint)' }}>Your allocations</div>
    <p style={{ margin: '14px 0 0', color: 'var(--nw-muted)', lineHeight: 1.55, maxWidth: '58ch' }}>Goals move only when you deliberately assign cash to them. Your investments and the rest of your net worth stay out of the calculation.</p>
    <div style={{ marginTop: 22, padding: 18, border: '1px solid var(--nw-line)', borderRadius: 14, background: 'var(--nw-surface)' }}>
      <div style={{ fontSize: 13, color: 'var(--nw-muted)' }}>Available to allocate from liquid cash</div>
      <div style={{ fontSize: 28, fontWeight: 600, marginTop: 4 }}>{fmt(available)}</div>
      <div style={{ fontSize: 12.5, color: 'var(--nw-faint)', marginTop: 4 }}>{fmt(allocated)} allocated across {goals.length} {goals.length === 1 ? 'goal' : 'goals'} · {fmt(totals.liquid)} liquid cash</div>
    </div>
    {goals.length > 0 && <div style={{ display: 'grid', gap: 12, marginTop: 24 }}>{goals.map((goal) => <div key={goal.id} style={{ padding: 18, border: '1px solid var(--nw-line)', borderRadius: 14 }}><GoalProgress goal={goal} />{goal.note && <p style={{ margin: '11px 0 0', color: 'var(--nw-muted)', fontSize: 13.5 }}>{goal.note}</p>}<div style={{ display: 'flex', gap: 12, marginTop: 14 }}><button type="button" className="nw-hover-accent" onClick={() => setEditing(goal)}>Edit allocation</button><button type="button" className="nw-hover-danger" disabled={removing} onClick={() => remove(goal.id)} style={{ color: 'var(--nw-faint)' }}>Remove</button></div></div>)}</div>}
    <div style={{ marginTop: 32, paddingTop: 26, borderTop: '1px solid var(--nw-line)' }}>
      <div style={{ fontSize: 19 }}>{selected ? `Edit ${selected.name}` : 'Add a goal'}</div>
      <form action={formAction} key={selected?.id ?? 'new'} style={{ marginTop: 18 }}>
        {selected && <input type="hidden" name="id" value={selected.id} />}
        <div style={{ display: 'grid', gap: 14 }}>
          <label>Goal name<input className="nw-input" name="name" required maxLength={80} defaultValue={selected?.name ?? ''} placeholder="Emergency fund" /></label>
          <label>Target (PHP)<input className="nw-input" name="target" required inputMode="decimal" defaultValue={selected ? centsToInput(selected.target_cents) : ''} placeholder="100000" /></label>
          <label>Allocated now (PHP)<input className="nw-input" name="allocated" required inputMode="decimal" defaultValue={selected ? centsToInput(selected.allocated_cents) : '0'} /><span style={{ display: 'block', marginTop: 5, fontSize: 12.5, color: 'var(--nw-faint)' }}>You can assign up to {fmt(selected ? available + selected.allocated_cents : available)} from currently unallocated cash.</span></label>
          <label>Target date (optional)<input className="nw-input" name="target_date" type="date" defaultValue={selected?.target_date ?? ''} /></label>
          <label>Note (optional)<input className="nw-input" name="note" maxLength={200} defaultValue={selected?.note ?? ''} placeholder="A little more breathing room." /></label>
        </div>
        {result.error && <p role="alert" style={{ color: 'var(--color-accent-2-600)' }}>{result.error}</p>}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}><button className="nw-btn-primary" disabled={pending} type="submit">{pending ? 'Saving…' : selected ? 'Save allocation' : 'Add goal'}</button>{selected && <button type="button" onClick={() => setEditing(null)}>Cancel</button>}</div>
      </form>
    </div>
  </div>
}
