'use client'

import { currentMonthKey } from '@/lib/dates'
import type { Goal } from '@/lib/goals'
import { totalsFrom, type Item, type ItemEvent, type Snapshot } from '@/lib/types'
import type { CategoryId } from '@/lib/categories'

const DB_NAME = 'networth-local'
const DB_VERSION = 1
const BACKUP_VERSION = 2

export type LocalData = { items: Item[]; snapshots: Snapshot[]; events: ItemEvent[]; goals: Goal[] }
export type LocalBackup = { format: 'networth-backup'; version: number; exportedAt: string; data: LocalData }

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onupgradeneeded = () => {
      const db = request.result
      for (const store of ['items', 'snapshots', 'events', 'settings']) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
  })
}

async function all<T>(store: string): Promise<T[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const request = tx.objectStore(store).getAll()
    request.onsuccess = () => resolve(request.result as T[])
    request.onerror = () => reject(request.error)
  })
}

async function put(store: string, value: unknown) {
  const db = await openDb()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).put(value)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function remove(store: string, id: string) {
  const db = await openDb()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function readLocalData(): Promise<LocalData> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['items', 'snapshots', 'events', 'settings'], 'readonly')
    const items = tx.objectStore('items').getAll()
    const snapshots = tx.objectStore('snapshots').getAll()
    const events = tx.objectStore('events').getAll()
    const settings = tx.objectStore('settings').getAll()
    tx.oncomplete = () => resolve({
      items: (items.result as Item[]).sort((a, b) => b.value_cents - a.value_cents),
      snapshots: (snapshots.result as (Snapshot & { id: string })[]).map(({ id: _id, ...snapshot }) => snapshot).sort((a, b) => a.month.localeCompare(b.month)),
      events: (events.result as ItemEvent[]).sort((a, b) => b.created_at.localeCompare(a.created_at)),
      goals: (() => { const values = settings.result as { id: string; value: Goal | Goal[] }[]; const saved = values.find((s) => s.id === 'goals')?.value; if (Array.isArray(saved)) return saved; const legacy = values.find((s) => s.id === 'goal')?.value as Partial<Goal> | undefined; return legacy ? [{ id: 'legacy-goal', name: 'Savings goal', target_cents: legacy.target_cents ?? 0, allocated_cents: 0, target_date: legacy.target_date ?? null, note: legacy.note ?? null }] : [] })(),
    })
    tx.onerror = () => reject(tx.error)
  })
}

function id() { return crypto.randomUUID() }
function iso() { return new Date().toISOString() }

function snapshotFor(items: Item[]) {
  const t = totalsFrom(items)
  const month = currentMonthKey()
  return { id: month, month, liquid_cents: t.liquid, invest_cents: t.invest, physical_cents: t.physical, liab_cents: t.liab }
}

export async function saveLocalItem(input: { id?: string; name: string; cat: CategoryId; value_cents: number; notes: string | null }) {
  const now = iso()
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['items', 'events', 'snapshots'], 'readwrite')
    const itemsStore = tx.objectStore('items')
    const current = itemsStore.getAll()
    current.onsuccess = () => {
      const items = current.result as Item[]
      const prior = input.id ? items.find((item) => item.id === input.id) : undefined
      const item: Item = prior ? { ...prior, name: input.name, cat: input.cat, value_cents: input.value_cents, notes: input.notes, updated_at: now } : { id: id(), name: input.name, cat: input.cat, value_cents: input.value_cents, notes: input.notes, created_at: now, updated_at: now }
      const event: ItemEvent = { id: id(), item_id: item.id, kind: prior ? 'edit' : 'add', cat: item.cat, item_name: item.name, before_cents: prior?.value_cents ?? null, after_cents: item.value_cents, created_at: now }
      itemsStore.put(item); tx.objectStore('events').put(event); tx.objectStore('snapshots').put(snapshotFor(prior ? items.map((x) => x.id === item.id ? item : x) : [...items, item]))
    }
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error ?? new Error('Local storage transaction was aborted.'))
  })
}

export async function deleteLocalItem(item: Item) {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['items', 'events', 'snapshots'], 'readwrite')
    const itemsStore = tx.objectStore('items'); const current = itemsStore.getAll()
    current.onsuccess = () => { const items = current.result as Item[]; const actual = items.find((candidate) => candidate.id === item.id) ?? item; itemsStore.delete(item.id); tx.objectStore('events').put({ id: id(), item_id: actual.id, kind: 'delete', cat: actual.cat, item_name: actual.name, before_cents: actual.value_cents, after_cents: null, created_at: iso() } satisfies ItemEvent); tx.objectStore('snapshots').put(snapshotFor(items.filter((candidate) => candidate.id !== item.id))) }
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error ?? new Error('Local storage transaction was aborted.'))
  })
}

export async function saveLocalGoals(goals: Goal[]) {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite')
    const store = tx.objectStore('settings')
    store.put({ id: 'goals', value: goals })
    store.delete('goal')
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error)
  })
}

export function createBackup(data: LocalData): LocalBackup {
  return { format: 'networth-backup', version: BACKUP_VERSION, exportedAt: iso(), data }
}

function validItem(value: unknown): value is Item {
  const x = value as Partial<Item>
  return !!x && typeof x.id === 'string' && typeof x.name === 'string' && x.name.trim().length > 0 && x.name.length <= 120 && ['liquid', 'invest', 'physical', 'liab'].includes(x.cat ?? '') && nonnegativeInt(x.value_cents) && (x.notes === null || typeof x.notes === 'string' && x.notes.length <= 500) && validIsoDate(x.created_at) && validIsoDate(x.updated_at)
}
function nonnegativeInt(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 }
function validIsoDate(value: unknown): value is string { return typeof value === 'string' && !Number.isNaN(Date.parse(value)) }
function validCalendarDate(value: unknown): value is string { if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const parsed = new Date(`${value}T00:00:00Z`); return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value) }
function validSnapshot(value: unknown): value is Snapshot {
  const x = value as Partial<Snapshot>
  return !!x && validCalendarDate(x.month) && x.month.endsWith('-01') && [x.liquid_cents, x.invest_cents, x.physical_cents, x.liab_cents].every(nonnegativeInt)
}
function validEvent(value: unknown): value is ItemEvent {
  const x = value as Partial<ItemEvent>
  return !!x && typeof x.id === 'string' && typeof x.item_id === 'string' && ['add', 'edit', 'delete'].includes(x.kind ?? '') && ['liquid', 'invest', 'physical', 'liab'].includes(x.cat ?? '') && typeof x.item_name === 'string' && x.item_name.length <= 120 && (x.before_cents === null || nonnegativeInt(x.before_cents)) && (x.after_cents === null || nonnegativeInt(x.after_cents)) && validIsoDate(x.created_at)
}
function validGoals(value: unknown): value is Goal[] {
  if (!Array.isArray(value)) return false
  return value.every((entry) => {
  const x = entry as Partial<Goal>
  return !!x && typeof x.id === 'string' && typeof x.name === 'string' && x.name.length > 0 && x.name.length <= 80 && typeof x.target_cents === 'number' && Number.isSafeInteger(x.target_cents) && x.target_cents > 0 && nonnegativeInt(x.allocated_cents) && (x.target_date === null || validCalendarDate(x.target_date)) && (x.note === null || typeof x.note === 'string' && x.note.length <= 200)
  })
}
function validLegacyGoal(value: unknown) {
  if (value === null) return true
  const x = value as Partial<Goal>
  return !!x && Number.isSafeInteger(x.target_cents) && (x.target_date === null || validCalendarDate(x.target_date)) && (x.note === null || typeof x.note === 'string' && x.note.length <= 200)
}

export function parseBackup(text: string): LocalBackup {
  let value: unknown
  try { value = JSON.parse(text) } catch { throw new Error('This is not a valid JSON backup.') }
  const backup = value as Partial<LocalBackup>
  if (backup.format !== 'networth-backup' || !backup.data || !Array.isArray(backup.data.items) || !Array.isArray(backup.data.snapshots) || !Array.isArray(backup.data.events) || !backup.data.items.every(validItem) || !backup.data.snapshots.every(validSnapshot) || !backup.data.events.every(validEvent) || !(backup.version === 2 && validGoals((backup.data as LocalData).goals) || backup.version === 1 && validLegacyGoal((backup.data as { goal?: unknown }).goal))) throw new Error('This backup is not a supported NetWorth backup.')
  if (backup.version === 1) { const legacy = (backup.data as { goal?: Partial<Goal> }).goal; ;(backup as LocalBackup).data.goals = legacy ? [{ id: 'legacy-goal', name: 'Savings goal', target_cents: legacy.target_cents ?? 0, allocated_cents: 0, target_date: legacy.target_date ?? null, note: legacy.note ?? null }] : [] }
  return backup as LocalBackup
}

export async function replaceLocalData(data: LocalData) {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['items', 'snapshots', 'events', 'settings'], 'readwrite')
    for (const store of ['items', 'snapshots', 'events', 'settings']) tx.objectStore(store).clear()
    for (const item of data.items) tx.objectStore('items').put(item)
    for (const snapshot of data.snapshots) tx.objectStore('snapshots').put({ ...snapshot, id: snapshot.month })
    for (const event of data.events) tx.objectStore('events').put(event)
    tx.objectStore('settings').put({ id: 'goals', value: data.goals })
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error)
  })
}
