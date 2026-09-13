'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { deleteItem } from '@/app/actions/items'
import { useTheme } from '@/components/theme'
import { useItemModal } from '@/components/item-modal-context'
import { categoryById, PALETTE, type CategoryId } from '@/lib/categories'
import { fmt } from '@/lib/money'
import { formatItemDate } from '@/lib/dates'
import { totalsFrom, type Item } from '@/lib/types'
import { useOptionalLocalData } from '@/components/local-data'

const MONO = "'IBM Plex Mono',monospace"

export function CategoryView({
  cat,
  items,
  basePath,
}: {
  cat: CategoryId
  items: Item[]
  basePath?: string
}) {
  const { theme } = useTheme()
  const P = PALETTE[theme]
  const { openAdd, openEdit } = useItemModal()
  const [pending, startTransition] = useTransition()
  const [removing, setRemoving] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const local = useOptionalLocalData()

  const category = categoryById(cat)
  const totals = useMemo(() => totalsFrom(items), [items])

  // Hide optimistically-deleted rows while the server round-trips.
  const rows = items.filter((i) => i.cat === cat && !removing.has(i.id))
  const isLiab = cat === 'liab'
  const denom = totals.assets || 1

  const onDelete = (item: Item) => {
    setError(null)
    setRemoving((prev) => new Set(prev).add(item.id))
    startTransition(async () => {
      if (local) {
        await local.deleteItem(item)
        return
      }
      const res = await deleteItem(item.id)
      if (res.error) {
        // Put it back — the row still exists on the server.
        setRemoving((prev) => {
          const next = new Set(prev)
          next.delete(item.id)
          return next
        })
        setError(res.error)
      }
    })
  }

  return (
    <div style={{ animation: 'nwIn .28s ease both' }}>
      <Link
        href={`${basePath ?? ''}/dashboard`}
        className="nw-hover-accent"
        style={{
          display: 'inline-block',
          color: 'var(--nw-muted)',
          fontSize: 14.5,
          padding: 0,
          marginBottom: 28,
        }}
      >
        ← Dashboard
      </Link>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 'var(--radius-sm)',
                background: P[cat],
              }}
            />
            <div
              style={{
                fontFamily: MONO,
                fontSize: 11,
                letterSpacing: '.16em',
                textTransform: 'uppercase',
                color: 'var(--nw-faint)',
              }}
            >
              {category.name}
            </div>
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontWeight: 500,
              fontSize: 'clamp(32px,6.5vw,58px)',
              lineHeight: 1.05,
              letterSpacing: '-.04em',
              marginTop: 14,
            }}
          >
            {isLiab && totals.liab > 0 ? '−' : ''}
            {fmt(totals[cat])}
          </div>
          <div
            style={{ fontSize: 15, color: 'var(--nw-muted)', marginTop: 8 }}
          >
            {rows.length} {rows.length === 1 ? 'item' : 'items'} ·{' '}
            {((totals[cat] / denom) * 100).toFixed(1)}% of total assets
          </div>
        </div>

        <button
          type="button"
          onClick={() => openAdd(cat)}
          className="nw-btn-outline"
          style={{
            marginLeft: 'auto',
            fontSize: 14.5,
            padding: '9px 16px',
          }}
        >
          + Add item
        </button>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            marginTop: 18,
            fontSize: 13.5,
            color: 'var(--color-accent-2-600)',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginTop: 34, borderTop: '1px solid var(--nw-line)' }}>
        {rows.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              flexWrap: 'wrap',
              padding: '18px 0',
              borderBottom: '1px solid var(--nw-hair)',
            }}
          >
            <div style={{ flex: '1 1 160px', minWidth: 0 }}>
              <div style={{ fontSize: 16.5 }}>{item.name}</div>
              <div
                style={{
                  fontSize: 13.5,
                  color: 'var(--nw-faint)',
                  marginTop: 3,
                }}
              >
                {item.notes || '—'}
              </div>
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 19,
                letterSpacing: '-.025em',
                minWidth: 130,
                textAlign: 'right',
                color: isLiab ? P.liab : 'inherit',
              }}
            >
              {isLiab ? '−' : ''}
              {fmt(item.value_cents)}
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 11,
                letterSpacing: '.08em',
                color: 'var(--nw-faint)',
                minWidth: 84,
                textAlign: 'right',
              }}
            >
              {formatItemDate(item.updated_at)}
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              <button
                type="button"
                onClick={() => openEdit(item)}
                className="nw-hover-accent"
                style={{
                  color: 'var(--nw-muted)',
                  fontSize: 13.5,
                  padding: '6px 9px',
                }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(item)}
                disabled={pending}
                className="nw-hover-danger"
                style={{
                  color: 'var(--nw-muted)',
                  fontSize: 13.5,
                  padding: '6px 9px',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {rows.length === 0 && (
          <div
            style={{
              padding: '46px 0',
              textAlign: 'center',
              color: 'var(--nw-faint)',
              fontSize: 15,
            }}
          >
            Nothing here yet.
          </div>
        )}
      </div>
    </div>
  )
}
