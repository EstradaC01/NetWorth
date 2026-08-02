import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { currentMonthKey } from '@/lib/dates'
import type { Goal } from '@/lib/goals'
import { totalsFrom, type Item, type ItemEvent, type Snapshot } from '@/lib/types'

/**
 * Server-side reads. Every query runs under the caller's session, so Row
 * Level Security scopes it to their own rows — the `user_id` filters here are
 * belt-and-braces, not the security boundary.
 *
 * Nothing on this path may be cached: a shared cache entry keyed by route
 * would serve one user's portfolio to another. Route segments that call these
 * are dynamic because they read cookies via the Supabase client.
 */

export async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function getItems(): Promise<Item[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('items')
    .select('id, cat, name, value_cents, notes, created_at, updated_at')
    .order('value_cents', { ascending: false })

  if (error) throw new Error(`Could not load items: ${error.message}`)
  return (data ?? []) as Item[]
}

export async function getSnapshots(): Promise<Snapshot[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('snapshots')
    .select('month, liquid_cents, invest_cents, physical_cents, liab_cents')
    .order('month', { ascending: true })

  if (error) throw new Error(`Could not load history: ${error.message}`)
  return (data ?? []) as Snapshot[]
}

/**
 * The user's goal, or null if they have not set one.
 *
 * `maybeSingle` rather than `single`: no goal is the normal state for a new
 * account, and `single` treats zero rows as an error to be thrown.
 */
export async function getGoal(): Promise<Goal | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('goals')
    .select('target_cents, target_date, note')
    .maybeSingle()

  if (error) throw new Error(`Could not load your goal: ${error.message}`)
  return (data as Goal | null) ?? null
}

/**
 * Recent activity, newest first.
 *
 * Bounded by `limit` because the log grows without end — an account editing
 * daily for two years has ~700 rows, and neither the history page nor the
 * response payload benefits from all of them.
 */
export async function getItemEvents(limit = 60): Promise<ItemEvent[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('item_events')
    .select('id, item_id, kind, cat, item_name, before_cents, after_cents, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Could not load activity: ${error.message}`)
  return (data ?? []) as ItemEvent[]
}

/**
 * Records (or corrects) the current month's snapshot from live item totals.
 *
 * Called after every mutation and on dashboard load. The read-side call is
 * what captures a month in which the user changed nothing but did visit; the
 * write-side call keeps the current month accurate as they edit. Earlier
 * months are never rewritten — a correction applies to the month it is made
 * in, so past readings stay as they were recorded.
 */
export async function recordCurrentSnapshot(userId: string, items: Item[]) {
  const supabase = await createClient()
  const t = totalsFrom(items)

  const { error } = await supabase.from('snapshots').upsert(
    {
      user_id: userId,
      month: currentMonthKey(),
      liquid_cents: t.liquid,
      invest_cents: t.invest,
      physical_cents: t.physical,
      liab_cents: t.liab,
    },
    { onConflict: 'user_id,month' }
  )

  // A failed snapshot must not break the page the user asked for; history is
  // secondary to seeing today's numbers.
  if (error) console.error('snapshot upsert failed:', error.message)
}
