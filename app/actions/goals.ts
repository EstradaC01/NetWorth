'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { parseAmount } from '@/lib/money'

/**
 * `savedAt` is a nonce for the same reason it is on ItemFormState: a boolean
 * success flag survives in `useActionState` across dialog opens and stops the
 * close-effect from firing a second time.
 */
export type GoalFormState = {
  error: string | null
  ok?: boolean
  savedAt?: number
}

export async function saveGoal(
  _prev: GoalFormState,
  formData: FormData
): Promise<GoalFormState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Sign in again.' }

  const rawTarget = String(formData.get('target') ?? '').trim()
  const rawDate = String(formData.get('target_date') ?? '').trim()
  const note = String(formData.get('note') ?? '').trim()

  // A goal may legitimately be negative — climbing from −₱800k to −₱200k is
  // a real target — so the leading minus is peeled off and reapplied rather
  // than handed to parseAmount, which rejects negatives for item values.
  const negative = rawTarget.startsWith('-')
  const amount = parseAmount(negative ? rawTarget.slice(1) : rawTarget)
  if (!amount.ok) return { error: amount.error }
  const target_cents = negative ? -amount.cents : amount.cents

  if (note.length > 200) return { error: 'That note is too long.' }

  let target_date: string | null = null
  if (rawDate) {
    // The date input yields 'YYYY-MM-DD'; anything else was hand-crafted.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate))
      return { error: 'Enter a valid date.' }
    // Reject a date the calendar does not have (2026-02-31 parses to March).
    const parsed = new Date(`${rawDate}T00:00:00Z`)
    if (Number.isNaN(parsed.getTime()) || !parsed.toISOString().startsWith(rawDate))
      return { error: 'Enter a valid date.' }
    target_date = rawDate
  }

  // Upsert on the primary key: one goal per user, so a second save replaces
  // the first rather than failing on a duplicate.
  const { error } = await supabase.from('goals').upsert(
    {
      user_id: user.id,
      target_cents,
      target_date,
      note: note || null,
    },
    { onConflict: 'user_id' }
  )
  if (error) return { error: 'Could not save your goal.' }

  revalidatePath('/dashboard')
  revalidatePath('/goal')
  return { error: null, ok: true, savedAt: Date.now() }
}

export async function clearGoal(): Promise<GoalFormState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Sign in again.' }

  // No user_id filter needed: RLS scopes the delete to the caller's own row.
  const { error } = await supabase.from('goals').delete().eq('user_id', user.id)
  if (error) return { error: 'Could not remove your goal.' }

  revalidatePath('/dashboard')
  revalidatePath('/goal')
  return { error: null, ok: true, savedAt: Date.now() }
}
