'use client'

import { useActionState, useEffect, useRef } from 'react'
import { saveItem, type ItemFormState } from '@/app/actions/items'
import { CATS } from '@/lib/categories'
import { centsToInput } from '@/lib/money'
import { useItemModal } from '@/components/item-modal-context'

const MONO = "'IBM Plex Mono',monospace"
const initial: ItemFormState = { error: null }

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: 10.5,
        letterSpacing: '.14em',
        textTransform: 'uppercase',
        color: 'var(--nw-faint)',
        marginBottom: 7,
      }}
    >
      {children}
    </div>
  )
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--nw-bg)',
  border: '1px solid var(--nw-line)',
  borderRadius: 'var(--radius-md)',
  padding: '11px 12px',
  fontSize: 15,
  outline: 'none',
}

/**
 * Outer shell: owns nothing but open/closed. The form lives in a separate
 * component that is remounted per dialog session (see the `key` below), so
 * `useActionState` starts clean every time — otherwise its result persists
 * across opens, leaving a stale error on screen and a success flag that would
 * never re-trigger the close effect.
 */
export function ItemModal() {
  const { state, close } = useItemModal()
  const open = state.mode !== 'closed'

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  if (!open) return null

  const item = state.mode === 'edit' ? state.item : null
  const sessionKey = item ? `edit-${item.id}` : `add-${state.mode === 'add' ? state.cat : ''}`

  return <ModalForm key={sessionKey} />
}

function ModalForm() {
  const { state, close } = useItemModal()
  const [result, formAction, pending] = useActionState(saveItem, initial)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  const editing = state.mode === 'edit'
  const item = state.mode === 'edit' ? state.item : null
  const defaultCat = state.mode === 'add' ? state.cat : item!.cat

  useEffect(() => {
    if (result.savedAt) close()
  }, [result.savedAt, close])

  useEffect(() => {
    firstFieldRef.current?.focus()
  }, [])

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background:
          'color-mix(in srgb, var(--color-neutral-900) 55%, transparent)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 'clamp(16px,6vh,64px) 16px',
        overflowY: 'auto',
        animation: 'nwFade .16s ease both',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="nw-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 430,
          background: 'var(--nw-surface)',
          border: '1px solid var(--nw-line)',
          borderRadius: 'var(--radius-md)',
          padding: 'clamp(22px,4vw,30px)',
          boxShadow: 'var(--shadow-lg)',
          animation: 'nwPop .2s ease both',
        }}
      >
        <div id="nw-modal-title" style={{ fontSize: 22, letterSpacing: '-.02em' }}>
          {editing ? 'Edit item' : 'Add item'}
        </div>

        {/* Remounted per item so defaultValue picks up the right row. */}
        <form action={formAction}>
          {item && <input type="hidden" name="id" value={item.id} />}

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              marginTop: 24,
            }}
          >
            <label style={{ display: 'block' }}>
              <Label>Name</Label>
              <input
                ref={firstFieldRef}
                name="name"
                required
                maxLength={120}
                defaultValue={item?.name ?? ''}
                placeholder="e.g. BPI Savings"
                style={fieldStyle}
              />
            </label>

            <label style={{ display: 'block' }}>
              <Label>Category</Label>
              <select
                name="cat"
                defaultValue={defaultCat}
                style={fieldStyle}
              >
                {CATS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'block' }}>
              <Label>Value (PHP)</Label>
              <input
                name="value"
                inputMode="decimal"
                required
                defaultValue={item ? centsToInput(item.value_cents) : ''}
                placeholder="0"
                style={{
                  ...fieldStyle,
                  fontFamily: MONO,
                  fontSize: 19,
                  letterSpacing: '-.02em',
                }}
              />
            </label>

            <label style={{ display: 'block' }}>
              <Label>
                Notes{' '}
                <span
                  style={{
                    textTransform: 'none',
                    letterSpacing: 0,
                    color: 'var(--nw-faint)',
                  }}
                >
                  optional
                </span>
              </Label>
              <input
                name="notes"
                maxLength={500}
                defaultValue={item?.notes ?? ''}
                placeholder="MacBook Pro, bought 2023"
                style={fieldStyle}
              />
            </label>
          </div>

          {result.error && (
            <div
              role="alert"
              style={{
                marginTop: 14,
                fontSize: 13.5,
                color: 'var(--color-accent-2-600)',
              }}
            >
              {result.error}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: 8,
              justifyContent: 'flex-end',
              marginTop: 28,
            }}
          >
            <button
              type="button"
              onClick={close}
              className="nw-hover-fg"
              style={{ fontSize: 14.5, padding: '10px 14px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="nw-btn-primary"
              disabled={pending}
              style={{ fontSize: 14.5, padding: '10px 20px' }}
            >
              {pending
                ? 'Saving…'
                : editing
                  ? 'Save changes'
                  : 'Add item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
