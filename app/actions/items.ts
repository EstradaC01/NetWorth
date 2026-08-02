'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isCategoryId } from '@/lib/categories'
import { parseAmount } from '@/lib/money'
import { getItems, recordCurrentSnapshot } from '@/lib/data'

/**
 * `savedAt` is a per-result nonce rather than a plain success flag.
 *
 * `useActionState` keeps its state across dialog opens, so a boolean `ok`
 * stays true after the first successful save and the modal's close-effect
 * never fires again — the second "Add item" would open a dialog that could
 * not be dismissed. A fresh value each time makes every success a distinct
 * event the effect can react to.
 */
export type ItemFormState = {
  error: string | null
  ok?: boolean
  savedAt?: number
}

/** Re-record this month's snapshot so history tracks the change. */
async function refreshSnapshot(userId: string) {
  const items = await getItems()
  await recordCurrentSnapshot(userId, items)
}

function revalidateAll() {
  revalidatePath('/dashboard')
  revalidatePath('/history')
  revalidatePath('/category', 'layout')
}

export async function saveItem(
  _prev: ItemFormState,
  formData: FormData
): Promise<ItemFormState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Sign in again.' }

  const id = String(formData.get('id') ?? '').trim()
  const name = String(formData.get('name') ?? '').trim()
  const cat = String(formData.get('cat') ?? '')
  const notesRaw = String(formData.get('notes') ?? '').trim()

  if (!name) return { error: 'Give the item a name.' }
  if (name.length > 120) return { error: 'That name is too long.' }
  if (!isCategoryId(cat)) return { error: 'Choose a category.' }
  if (notesRaw.length > 500) return { error: 'Those notes are too long.' }

  const amount = parseAmount(String(formData.get('value') ?? ''))
  if (!amount.ok) return { error: amount.error }

  const notes = notesRaw || null

  if (id) {
    // No user_id in the filter: RLS already restricts this to the caller's
    // own rows, and a forged id simply matches nothing.
    const { error } = await supabase
      .from('items')
      .update({ name, cat, value_cents: amount.cents, notes })
      .eq('id', id)
    if (error) return { error: 'Could not save that change.' }
  } else {
    const { error } = await supabase.from('items').insert({
      user_id: user.id,
      name,
      cat,
      value_cents: amount.cents,
      notes,
    })
    if (error) return { error: 'Could not add that item.' }
  }

  await refreshSnapshot(user.id)
  revalidateAll()
  return { error: null, ok: true, savedAt: Date.now() }
}

export async function deleteItem(id: string): Promise<ItemFormState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Sign in again.' }

  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) return { error: 'Could not delete that item.' }

  await refreshSnapshot(user.id)
  revalidateAll()
  return { error: null, ok: true, savedAt: Date.now() }
}
