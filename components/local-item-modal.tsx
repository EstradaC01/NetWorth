'use client'

import { useEffect, useRef, useState } from 'react'
import { CATS } from '@/lib/categories'
import { centsToInput, parseAmount } from '@/lib/money'
import { useItemModal } from '@/components/item-modal-context'
import { useLocalData } from '@/components/local-data'

const MONO = "'IBM Plex Mono',monospace"
const fieldStyle: React.CSSProperties = { width: '100%', background: 'var(--nw-bg)', border: '1px solid var(--nw-line)', borderRadius: 'var(--radius-md)', padding: '11px 12px', fontSize: 15, outline: 'none' }
function Label({ children }: { children: React.ReactNode }) { return <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--nw-faint)', marginBottom: 7 }}>{children}</div> }

export function LocalItemModal() {
  const { state, close } = useItemModal()
  const local = useLocalData()
  const first = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const open = state.mode !== 'closed'
  useEffect(() => { if (open) first.current?.focus() }, [open])
  useEffect(() => { const handler = (event: KeyboardEvent) => event.key === 'Escape' && close(); if (open) document.addEventListener('keydown', handler); return () => document.removeEventListener('keydown', handler) }, [open, close])
  if (!open) return null
  const item = state.mode === 'edit' ? state.item : undefined
  const defaultCat = state.mode === 'add' ? state.cat : item!.cat
  async function submit(form: HTMLFormElement) {
    const name = String(new FormData(form).get('name') ?? '').trim()
    const cat = String(new FormData(form).get('cat') ?? '')
    const notes = String(new FormData(form).get('notes') ?? '').trim()
    const amount = parseAmount(String(new FormData(form).get('value') ?? ''))
    if (!name) return setError('Give the item a name.')
    if (!['liquid', 'invest', 'physical', 'liab'].includes(cat)) return setError('Choose a category.')
    if (!amount.ok) return setError(amount.error)
    setPending(true); setError(null)
    try { await local.saveItem({ id: item?.id, name, cat: cat as typeof defaultCat, value_cents: amount.cents, notes: notes || null }); close() } catch { setError('Could not save this item in local storage.') } finally { setPending(false) }
  }
  return <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'color-mix(in srgb, var(--color-neutral-900) 55%, transparent)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 'clamp(16px,6vh,64px) 16px', overflowY: 'auto' }}><div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 430, background: 'var(--nw-surface)', border: '1px solid var(--nw-line)', borderRadius: 'var(--radius-md)', padding: 'clamp(22px,4vw,30px)', boxShadow: 'var(--shadow-lg)' }}><div style={{ fontSize: 22 }}>{item ? 'Edit item' : 'Add item'}</div><form onSubmit={(e) => { e.preventDefault(); void submit(e.currentTarget) }}><div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}><label><Label>Name</Label><input ref={first} name="name" required maxLength={120} defaultValue={item?.name ?? ''} style={fieldStyle} /></label><label><Label>Category</Label><select name="cat" defaultValue={defaultCat} style={fieldStyle}>{CATS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label><Label>Value (PHP)</Label><input name="value" inputMode="decimal" required defaultValue={item ? centsToInput(item.value_cents) : ''} style={{ ...fieldStyle, fontFamily: MONO, fontSize: 19 }} /></label><label><Label>Notes</Label><input name="notes" maxLength={500} defaultValue={item?.notes ?? ''} style={fieldStyle} /></label></div>{error && <div role="alert" style={{ marginTop: 14, fontSize: 13.5, color: 'var(--color-accent-2-600)' }}>{error}</div>}<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 28 }}><button type="button" onClick={close} style={{ padding: '10px 14px' }}>Cancel</button><button type="submit" className="nw-btn-primary" disabled={pending} style={{ padding: '10px 20px' }}>{pending ? 'Saving…' : item ? 'Save changes' : 'Add item'}</button></div></form></div></div>
}
