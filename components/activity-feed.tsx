'use client'

import { useTheme } from '@/components/theme'
import { categoryById, PALETTE } from '@/lib/categories'
import { fmt, short } from '@/lib/money'
import { formatItemDate } from '@/lib/dates'
import { eventDelta, type ItemEvent } from '@/lib/types'

const MONO = "'IBM Plex Mono',monospace"

const VERB: Record<ItemEvent['kind'], string> = {
  add: 'Added',
  edit: 'Changed',
  delete: 'Removed',
}

/**
 * What actually changed, newest first.
 *
 * The point of this feed is to answer "why did the line move?", which the
 * snapshot chart cannot — it only shows that a total differs from last
 * month's. So each row leads with the effect on net worth and keeps the
 * before → after figures alongside it.
 *
 * A flat reverse-chronological list, not grouped by month: the list is capped
 * well below the point where scanning becomes hard, and month headings would
 * imply the feed aligns with the snapshot chart above it when in fact several
 * edits can land in one month and some months have none.
 */
export function ActivityFeed({ events }: { events: ItemEvent[] }) {
  const { theme } = useTheme()
  const P = PALETTE[theme]

  if (events.length === 0) return null

  return (
    <div style={{ marginTop: 'clamp(40px,5vw,64px)' }}>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: '.16em',
          textTransform: 'uppercase',
          color: 'var(--nw-faint)',
          marginBottom: 6,
        }}
      >
        Activity
      </div>
      <div
        style={{
          fontSize: 14.5,
          color: 'var(--nw-muted)',
          marginBottom: 20,
          maxWidth: '54ch',
          lineHeight: 1.5,
        }}
      >
        Every change you have made, and what it did to your net worth.
      </div>

      <div style={{ borderTop: '1px solid var(--nw-line)' }}>
        {events.map((e) => {
          const delta = eventDelta(e)
          const cat = categoryById(e.cat)
          return (
            <div
              key={e.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
                padding: '14px 0',
                borderBottom: '1px solid var(--nw-hair)',
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 'var(--radius-sm)',
                  background: P[e.cat],
                  flex: '0 0 auto',
                }}
              />

              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div style={{ fontSize: 15.5 }}>
                  <span style={{ color: 'var(--nw-muted)' }}>
                    {VERB[e.kind]}{' '}
                  </span>
                  {e.item_name}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 11,
                    letterSpacing: '.06em',
                    color: 'var(--nw-faint)',
                    marginTop: 4,
                  }}
                >
                  {cat.name} · {formatItemDate(e.created_at)}
                </div>
              </div>

              {/* before → after, shown only for an edit: on an add there is
                  no "before" and on a delete no "after", and rendering a
                  bare arrow from nothing reads as a missing value. */}
              {e.kind === 'edit' && (
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 12.5,
                    color: 'var(--nw-faint)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {short(e.before_cents ?? 0)} → {short(e.after_cents ?? 0)}
                </div>
              )}

              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 15,
                  minWidth: 96,
                  textAlign: 'right',
                  color:
                    delta === 0
                      ? 'var(--nw-faint)'
                      : delta > 0
                        ? P.pos
                        : P.neg,
                }}
              >
                {delta > 0 ? '+' : delta < 0 ? '−' : ''}
                {fmt(delta)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
