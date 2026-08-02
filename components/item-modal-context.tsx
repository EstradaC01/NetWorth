'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { CategoryId } from '@/lib/categories'
import type { Item } from '@/lib/types'

type ModalState =
  | { mode: 'closed' }
  | { mode: 'add'; cat: CategoryId }
  | { mode: 'edit'; item: Item }

type ItemModalValue = {
  state: ModalState
  openAdd: (cat?: CategoryId) => void
  openEdit: (item: Item) => void
  close: () => void
}

const Ctx = createContext<ItemModalValue | null>(null)

export function ItemModalProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ModalState>({ mode: 'closed' })

  const openAdd = useCallback(
    (cat: CategoryId = 'liquid') => setState({ mode: 'add', cat }),
    []
  )
  const openEdit = useCallback(
    (item: Item) => setState({ mode: 'edit', item }),
    []
  )
  const close = useCallback(() => setState({ mode: 'closed' }), [])

  const value = useMemo(
    () => ({ state, openAdd, openEdit, close }),
    [state, openAdd, openEdit, close]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useItemModal(): ItemModalValue {
  const ctx = useContext(Ctx)
  if (!ctx)
    throw new Error('useItemModal must be used inside <ItemModalProvider>')
  return ctx
}
