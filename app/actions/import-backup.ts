'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ImportState = { error: string | null; ok?: boolean; message?: string }
const categories = new Set(['liquid', 'invest', 'physical', 'liab'])
function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value) }
function isSafeMoney(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) }

/** Imports a local JSON backup only after the signed-in owner deliberately
 * submits it. This is an upload by user choice, never background syncing. */
export async function importLocalBackup(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const file = formData.get('backup')
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose a JSON backup first.' }
  if (file.size > 5 * 1024 * 1024) return { error: 'That backup is too large to import.' }
  let raw: unknown
  try { raw = JSON.parse(await file.text()) } catch { return { error: 'This is not valid JSON.' } }
  if (!isRecord(raw) || raw.format !== 'networth-backup' || raw.version !== 1 || !isRecord(raw.data)) return { error: 'Choose a NetWorth local backup file.' }
  const { items, snapshots, events, goal } = raw.data
  if (!Array.isArray(items) || !Array.isArray(snapshots) || !Array.isArray(events)) return { error: 'The backup is missing required records.' }
  if (!items.every((x) => isRecord(x) && typeof x.id === 'string' && typeof x.name === 'string' && x.name.trim().length > 0 && x.name.length <= 120 && typeof x.cat === 'string' && categories.has(x.cat) && isSafeMoney(x.value_cents) && x.value_cents >= 0 && (x.notes === null || typeof x.notes === 'string') && typeof x.created_at === 'string' && typeof x.updated_at === 'string')) return { error: 'The backup contains an invalid item.' }
  const validDate = (value: unknown) => { if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const parsed = new Date(`${value}T00:00:00Z`); return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value) }
  if (!snapshots.every((x) => isRecord(x) && validDate(x.month) && String(x.month).endsWith('-01') && ['liquid_cents', 'invest_cents', 'physical_cents', 'liab_cents'].every((key) => isSafeMoney(x[key]) && x[key] >= 0))) return { error: 'The backup contains an invalid snapshot.' }
  if (!events.every((x) => isRecord(x) && typeof x.id === 'string' && typeof x.item_id === 'string' && ['add', 'edit', 'delete'].includes(String(x.kind)) && typeof x.cat === 'string' && categories.has(x.cat) && typeof x.item_name === 'string' && (x.before_cents === null || isSafeMoney(x.before_cents)) && (x.after_cents === null || isSafeMoney(x.after_cents)) && typeof x.created_at === 'string')) return { error: 'The backup contains an invalid activity event.' }
  if (goal !== null && (!isRecord(goal) || !isSafeMoney(goal.target_cents) || (goal.target_date !== null && typeof goal.target_date !== 'string') || (goal.note !== null && typeof goal.note !== 'string'))) return { error: 'The backup contains an invalid goal.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Sign in again.' }
  // One database function means an invalid row or transient database error
  // rolls back the entire migration rather than leaving a partial account.
  const { error } = await supabase.rpc('import_local_backup', { p_payload: raw.data })
  if (error) return { error: 'Could not import this backup. Your account was not changed.' }
  revalidatePath('/dashboard'); revalidatePath('/history'); revalidatePath('/goal'); revalidatePath('/category', 'layout')
  return { error: null, ok: true, message: 'Your local backup has been copied into this account.' }
}
