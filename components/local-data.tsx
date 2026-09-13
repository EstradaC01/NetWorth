'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { CategoryId } from '@/lib/categories'
import type { Goal } from '@/lib/goals'
import type { Item } from '@/lib/types'
import { deleteLocalItem, readLocalData, saveLocalGoals, saveLocalItem, type LocalData } from '@/lib/local-db'

type LocalContext = LocalData & { ready: boolean; refresh: () => Promise<void>; saveItem: (input: { id?: string; name: string; cat: CategoryId; value_cents: number; notes: string | null }) => Promise<void>; deleteItem: (item: Item) => Promise<void>; saveGoals: (goals: Goal[]) => Promise<void> }
const Ctx = createContext<LocalContext | null>(null)

export function LocalDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<LocalData>({ items: [], snapshots: [], events: [], goals: [] })
  const [ready, setReady] = useState(false)
  const refresh = useCallback(async () => { setData(await readLocalData()); setReady(true) }, [])
  useEffect(() => { void refresh() }, [refresh])
  const saveItem = useCallback(async (input: Parameters<LocalContext['saveItem']>[0]) => { await saveLocalItem(input); await refresh() }, [refresh])
  const deleteItem = useCallback(async (item: Item) => { await deleteLocalItem(item); await refresh() }, [refresh])
  const saveGoals = useCallback(async (goals: Goal[]) => { await saveLocalGoals(goals); await refresh() }, [refresh])
  const value = useMemo(() => ({ ...data, ready, refresh, saveItem, deleteItem, saveGoals }), [data, ready, refresh, saveItem, deleteItem, saveGoals])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export function useLocalData() { const context = useContext(Ctx); if (!context) throw new Error('Local data is unavailable.'); return context }
export function useOptionalLocalData() { return useContext(Ctx) }
