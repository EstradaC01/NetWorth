'use client'

import { useMemo, useState } from 'react'
import { useTheme } from '@/components/theme'
import { ActivityFeed } from '@/components/activity-feed'
import { ExportLinks } from '@/components/export-links'
import { CloudImport } from '@/components/cloud-import'
import { CATS, PALETTE } from '@/lib/categories'
import { fmt, short } from '@/lib/money'
import { extent, gridLines, path } from '@/lib/chart'
import { formatMonthLabel, monthsBetween } from '@/lib/dates'
import {
  totalsFrom,
  totalsFromSnapshot,
  type Item,
  type ItemEvent,
  type Snapshot,
} from '@/lib/types'

const MONO = "'IBM Plex Mono',monospace"
const W = 1000
const HH = 420
const PAD = 14

type SeriesKey = 'net' | 'liquid' | 'invest' | 'physical' | 'liab'

const ROWS: { id: SeriesKey; name: string }[] = [
  { id: 'net', name: 'Net worth' },
  ...CATS.map((c) => ({ id: c.id as SeriesKey, name: c.name })),
]

export function HistoryView({
  items,
  snapshots,
  events,
  localOnly = false,
}: {
  items: Item[]
  snapshots: Snapshot[]
  events: ItemEvent[]
  /** Local workspaces use their own browser-side backup controls. */
  localOnly?: boolean
}) {
  const { theme } = useTheme()
  const P = PALETTE[theme]
  const [hidden, setHidden] = useState<Set<SeriesKey>>(new Set())

  const totals = useMemo(() => totalsFrom(items), [items])

  const points = useMemo(
    () =>
      snapshots.map((s) => ({ month: s.month, ...totalsFromSnapshot(s) })),
    [snapshots]
  )

  const delta = useMemo(() => {
    if (points.length < 2) return null
    const newest = points[points.length - 1].month
    const baseline = [...points]
      .reverse()
      .find((p) => monthsBetween(p.month, newest) >= 12)
    if (!baseline) return null
    return { from: baseline.net, diff: totals.net - baseline.net }
  }, [points, totals.net])

  const visible = ROWS.filter((r) => !hidden.has(r.id))
  const flat = visible.flatMap((r) => points.map((p) => p[r.id]))
  const { lo, hi } = extent(flat, 0.06)

  const toggle = (id: SeriesKey) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const enoughData = points.length >= 2

  return (
    <div style={{ animation: 'nwIn .28s ease both' }}>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: '.16em',
          textTransform: 'uppercase',
          color: 'var(--nw-faint)',
        }}
      >
        History ·{' '}
        {points.length === 0
          ? 'no readings yet'
          : `${points.length} ${points.length === 1 ? 'month' : 'months'}`}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 16,
          flexWrap: 'wrap',
          marginTop: 14,
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontWeight: 500,
            fontSize: 'clamp(32px,6.5vw,58px)',
            lineHeight: 1.05,
            letterSpacing: '-.04em',
          }}
        >
          {totals.net < 0 ? '−' : ''}
          {fmt(totals.net)}
        </div>
        {delta && (
          <div
            style={{
              fontFamily: MONO,
              fontSize: 15.5,
              color: delta.diff >= 0 ? P.pos : P.neg,
              paddingBottom: 8,
            }}
          >
            {delta.diff >= 0 ? '▲ ' : '▼ '}
            {fmt(delta.diff)}
          </div>
        )}
      </div>

      {!enoughData ? (
        <div
          style={{
            marginTop: 34,
            paddingTop: 28,
            borderTop: '1px solid var(--nw-line)',
            color: 'var(--nw-muted)',
            fontSize: 15,
            maxWidth: '52ch',
            lineHeight: 1.5,
          }}
        >
          {points.length === 0
            ? 'Nothing recorded yet. Add an item and your first monthly reading is saved straight away.'
            : 'History starts here. Your net worth is recorded once a month, so the chart appears from your second month onward — nothing before that is estimated or filled in.'}
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              marginTop: 26,
            }}
          >
            {ROWS.map((r) => {
              const on = !hidden.has(r.id)
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggle(r.id)}
                  aria-pressed={on}
                  className="nw-chip"
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 'var(--radius-sm)',
                      background: on ? P[r.id] : 'var(--nw-faint)',
                      // P.net is the page foreground, so the net-worth swatch
                      // would vanish against the chip. A hairline keeps it
                      // visible in both themes without changing its colour.
                      boxShadow:
                        r.id === 'net' && on
                          ? '0 0 0 1px var(--nw-line)'
                          : undefined,
                    }}
                  />
                  {r.name}
                </button>
              )
            })}
          </div>

          <div style={{ marginTop: 26, position: 'relative' }}>
            <svg
              viewBox={`0 0 ${W} ${HH}`}
              preserveAspectRatio="none"
              role="img"
              aria-label="Net worth and category totals over time"
              style={{
                width: '100%',
                height: 'clamp(250px,45vh,420px)',
                display: 'block',
                overflow: 'visible',
              }}
            >
              {gridLines(HH, [0.1, 0.3, 0.5, 0.7, 0.9]).map((g, i) => (
                <line
                  key={i}
                  x1="0"
                  y1={g.y}
                  x2={W}
                  y2={g.y}
                  stroke={P.hair}
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {visible.map((r) => (
                <path
                  key={r.id}
                  d={path(
                    points.map((p) => p[r.id]),
                    W,
                    HH,
                    lo,
                    hi,
                    PAD
                  )}
                  fill="none"
                  stroke={P[r.id]}
                  strokeWidth={r.id === 'net' ? 2 : 1.6}
                  strokeDasharray={r.id === 'liab' ? '5 4' : undefined}
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}
            </svg>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 10,
                fontFamily: MONO,
                fontSize: 10.5,
                letterSpacing: '.1em',
                color: 'var(--nw-faint)',
              }}
            >
              <div>{formatMonthLabel(points[0].month)}</div>
              <div>
                {formatMonthLabel(
                  points[Math.floor(points.length / 2)].month
                )}
              </div>
              <div>
                {formatMonthLabel(points[points.length - 1].month)}
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                left: 0,
                top: -4,
                fontFamily: MONO,
                fontSize: 10.5,
                color: 'var(--nw-faint)',
              }}
            >
              {short(hi)}
            </div>
          </div>

          <div
            style={{ marginTop: 44, borderTop: '1px solid var(--nw-line)' }}
          >
            {ROWS.map((r) => {
              const first = points[0][r.id]
              const last = points[points.length - 1][r.id]
              const chg = last - first
              // For debt, going down is the good direction.
              const good = r.id === 'liab' ? chg < 0 : chg > 0
              return (
                <div
                  key={r.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                    padding: '15px 0',
                    borderBottom: '1px solid var(--nw-hair)',
                    opacity: hidden.has(r.id) ? 0.4 : 1,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 'var(--radius-sm)',
                      background: P[r.id],
                      flex: '0 0 auto',
                    }}
                  />
                  <div
                    style={{
                      flex: '1 1 130px',
                      minWidth: 0,
                      fontSize: 15.5,
                    }}
                  >
                    {r.name}
                  </div>
                  <div
                    style={{
                      flex: '1 1 auto',
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'flex-end',
                      gap: 12,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 13,
                        color: 'var(--nw-faint)',
                        textAlign: 'right',
                      }}
                    >
                      {short(first)}
                    </div>
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 12,
                        color: 'var(--nw-faint)',
                      }}
                    >
                      →
                    </div>
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 15,
                        textAlign: 'right',
                      }}
                    >
                      {short(last)}
                    </div>
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 13,
                        minWidth: 76,
                        textAlign: 'right',
                        color: chg === 0 ? 'var(--nw-faint)' : good ? P.pos : P.neg,
                      }}
                    >
                      {chg >= 0 ? '+' : '−'}
                      {short(chg)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Both sit outside the `enoughData` branch: a user with a single
          month still has edits worth reviewing and data worth exporting. */}
      <ActivityFeed events={events} />
      {!localOnly && <><ExportLinks /><CloudImport /></>}
    </div>
  )
}
