'use server'

import { revalidatePath } from 'next/cache'
import { parseAmount } from '@/lib/money'
import { createClient } from '@/lib/supabase/server'

export type GoalFormState = { error: string | null; ok?: boolean; savedAt?: number }

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}

export async function saveGoal(_prev: GoalFormState, formData: FormData): Promise<GoalFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Sign in again.' }
  const id = String(formData.get('id') ?? '').trim()
  const name = String(formData.get('name') ?? '').trim()
  const target = parseAmount(String(formData.get('target') ?? '').trim())
  const allocation = parseAmount(String(formData.get('allocated') ?? '').trim())
  const date = String(formData.get('target_date') ?? '').trim()
  const note = String(formData.get('note') ?? '').trim()
  if (name.length < 1 || name.length > 80) return { error: 'Give this goal a name of up to 80 characters.' }
  if (!target.ok) return { error: target.error }
  if (target.cents <= 0) return { error: 'Your target must be greater than zero.' }
  if (!allocation.ok) return { error: allocation.error }
  if (allocation.cents > target.cents) return { error: 'You cannot allocate more than this goal’s target.' }
  if (note.length > 200) return { error: 'That note is too long.' }
  if (date && !validDate(date)) return { error: 'Enter a valid date.' }
  const [{ data: items, error: itemsError }, { data: existing, error: goalsError }] = await Promise.all([
    supabase.from('items').select('cat, value_cents'),
    supabase.from('goals').select('id, allocated_cents'),
  ])
  if (itemsError || goalsError) return { error: 'Could not check your available cash.' }
  const liquid = (items ?? []).filter((item) => item.cat === 'liquid').reduce((sum, item) => sum + item.value_cents, 0)
  const alreadyAllocated = (existing ?? []).filter((goal) => goal.id !== id).reduce((sum, goal) => sum + goal.allocated_cents, 0)
  if (alreadyAllocated + allocation.cents > liquid) return { error: `Only ${(liquid - alreadyAllocated) / 100} PHP is available to allocate.` }
  const record = { user_id: user.id, name, target_cents: target.cents, allocated_cents: allocation.cents, target_date: date || null, note: note || null }
  const { error } = id ? await supabase.from('goals').update(record).eq('id', id) : await supabase.from('goals').insert(record)
  if (error) return { error: 'Could not save your goal.' }
  revalidatePath('/dashboard'); revalidatePath('/goal')
  return { error: null, ok: true, savedAt: Date.now() }
}

export async function clearGoal(id: string): Promise<GoalFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Sign in again.' }
  const { error } = await supabase.from('goals').delete().eq('id', id)
  if (error) return { error: 'Could not remove your goal.' }
  revalidatePath('/dashboard'); revalidatePath('/goal')
  return { error: null, ok: true, savedAt: Date.now() }
}
