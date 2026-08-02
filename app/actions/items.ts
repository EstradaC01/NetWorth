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

/**
 * Appends to the activity log.
 *
 * Failures are logged and swallowed, exactly as snapshot failures are: the
 * mutation the user asked for has already succeeded at this point, and
 * reporting an error for a bookkeeping row would tell them their edit failed
 * when it did not. The log is a convenience over the items themselves, which
 * remain the record of truth.
 */
async function logEvent(
  userId: string,
  row: {
    item_id: string
    kind: 'add' | 'edit' | 'delete'
    cat: string
    item_name: string
    before_cents: number | null
    after_cents: number | null
  }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('item_events')
    .insert({ user_id: userId, ...row })
  if (error) console.error('activity log insert failed:', error.message)
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
    // The prior value has to be read before the update overwrites it — this
    // is what lets the log say "₱500k → ₱620k" rather than just "changed".
    // RLS scopes the read, so a forged id returns nothing and the log entry
    // is skipped along with the (equally empty) update.
    const { data: prior } = await supabase
      .from('items')
      .select('value_cents')
      .eq('id', id)
      .maybeSingle()

    // No user_id in the filter: RLS already restricts this to the caller's
    // own rows, and a forged id simply matches nothing.
    const { error } = await supabase
      .from('items')
      .update({ name, cat, value_cents: amount.cents, notes })
      .eq('id', id)
    if (error) return { error: 'Could not save that change.' }

    if (prior) {
      await logEvent(user.id, {
        item_id: id,
        kind: 'edit',
        cat,
        item_name: name,
        before_cents: prior.value_cents,
        after_cents: amount.cents,
      })
    }
  } else {
    // `select('id').single()` so the log can key on the generated uuid; the
    // insert would otherwise return nothing to reference.
    const { data: created, error } = await supabase
      .from('items')
      .insert({
        user_id: user.id,
        name,
        cat,
        value_cents: amount.cents,
        notes,
      })
      .select('id')
      .single()
    if (error) return { error: 'Could not add that item.' }

    await logEvent(user.id, {
      item_id: created.id,
      kind: 'add',
      cat,
      item_name: name,
      before_cents: null,
      after_cents: amount.cents,
    })
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

  // Read before deleting: after the row is gone there is nothing left to
  // describe it, and a deletion is the event most worth having in the log.
  const { data: prior } = await supabase
    .from('items')
    .select('cat, name, value_cents')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) return { error: 'Could not delete that item.' }

  if (prior) {
    await logEvent(user.id, {
      item_id: id,
      kind: 'delete',
      cat: prior.cat,
      item_name: prior.name,
      before_cents: prior.value_cents,
      after_cents: null,
    })
  }

  await refreshSnapshot(user.id)
  revalidateAll()
  return { error: null, ok: true, savedAt: Date.now() }
}
