'use client'

import { useMemo, useState } from 'react'
import { GoalProgress } from '@/components/goal-progress'
import { centsToInput, parseAmount } from '@/lib/money'
import { totalsFrom } from '@/lib/types'
import { useLocalData } from '@/components/local-data'

export function LocalGoalView() {
  const { goal, items, snapshots, saveGoal } = useLocalData()
  const [error, setError] = useState<string | null>(null); const [pending, setPending] = useState(false)
  const totals = useMemo(() => totalsFrom(items), [items])
  async function submit(form: HTMLFormElement) { const raw = String(new FormData(form).get('target') ?? '').trim(); const negative = raw.startsWith('-'); const amount = parseAmount(negative ? raw.slice(1) : raw); const date = String(new FormData(form).get('target_date') ?? ''); const note = String(new FormData(form).get('note') ?? '').trim(); if (!amount.ok) return setError(amount.error); if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError('Enter a valid date.'); setPending(true); try { await saveGoal({ target_cents: negative ? -amount.cents : amount.cents, target_date: date || null, note: note || null }); setError(null) } catch { setError('Could not save this goal locally.') } finally { setPending(false) } }
  return <div style={{ maxWidth: 620 }}><div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--nw-faint)' }}>Your goal · local only</div>{goal ? <div style={{ marginTop: 26 }}><GoalProgress goal={goal} currentNet={totals.net} snapshots={snapshots} /></div> : <p style={{ color: 'var(--nw-muted)', lineHeight: 1.5 }}>Set a number to aim at. Your goal is stored only on this device.</p>}<div style={{ marginTop: 40, paddingTop: 30, borderTop: '1px solid var(--nw-line)' }}><div style={{ fontSize: 19 }}>{goal ? 'Change your goal' : 'Set a goal'}</div><form key={goal ? String(goal.target_cents) : 'new'} onSubmit={(e) => { e.preventDefault(); void submit(e.currentTarget) }}><div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 22 }}><label>Target net worth (PHP)<input className="nw-input" name="target" required inputMode="decimal" defaultValue={goal ? centsToInput(goal.target_cents) : ''} /></label><label>By (optional)<input className="nw-input" name="target_date" type="date" defaultValue={goal?.target_date ?? ''} /></label><label>Why (optional)<input className="nw-input" name="note" maxLength={200} defaultValue={goal?.note ?? ''} /></label></div>{error && <p role="alert" style={{ color: 'var(--color-accent-2-600)' }}>{error}</p>}<div style={{ display: 'flex', gap: 8, marginTop: 26 }}><button className="nw-btn-primary" disabled={pending} type="submit">{pending ? 'Saving…' : 'Save goal'}</button>{goal && <button type="button" onClick={() => void saveGoal(null)} style={{ marginLeft: 'auto' }}>Remove goal</button>}</div></form></div></div>
}
