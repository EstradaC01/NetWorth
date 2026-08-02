'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/components/theme'
import { useItemModal } from '@/components/item-modal-context'
import { EmptyState } from '@/components/empty-state'
import { GoalProgress } from '@/components/goal-progress'
import { InsightStrip } from '@/components/insight-strip'
import { ASSET_CATS, CATS, PALETTE } from '@/lib/categories'
import { fmt, pctChange } from '@/lib/money'
import { extent, gridLines, path, xAt } from '@/lib/chart'
import { formatLongDate, formatMonthLabel, monthsBetween } from '@/lib/dates'
import { buildInsights } from '@/lib/insights'
import type { Goal } from '@/lib/goals'
import { totalsFrom, totalsFromSnapshot, type Item, type Snapshot } from '@/lib/types'

const MONO = "'IBM Plex Mono',monospace"
const W = 1000
const H = 300
const PAD = 18

const RANGES = [
  { label: '6M', months: 6 },
  { label: '1Y', months: 12 },
  { label: 'ALL', months: Infinity },
] as const

export function Dashboard({
  items,
  snapshots,
  goal,
}: {
  items: Item[]
  snapshots: Snapshot[]
  goal: Goal | null
}) {
  const { theme } = useTheme()
  const P = PALETTE[theme]
  const router = useRouter()
  const { openAdd } = useItemModal()

  const [rangeIdx, setRangeIdx] = useState(2)
  const [hover, setHover] = useState(-1)

  const totals = useMemo(() => totalsFrom(items), [items])
  const insights = useMemo(
    () => buildInsights(items, snapshots),
    [items, snapshots]
  )

  // Only real recorded months are charted — nothing is synthesised.
  const series = useMemo(() => {
    const months = RANGES[rangeIdx].months
    const all = snapshots.map((s) => ({
      month: s.month,
      net: totalsFromSnapshot(s).net,
    }))
    if (!Number.isFinite(months) || all.length === 0) return all
    const newest = all[all.length - 1].month
    return all.filter((p) => monthsBetween(p.month, newest) < months)
  }, [snapshots, rangeIdx])

  const values = series.map((p) => p.net)
  const { lo, hi } = extent(values)
  const netPath = path(values, W, H, lo, hi, PAD)

  // Delta against the closest snapshot at least 12 months old.
  const delta = useMemo(() => {
    if (snapshots.length === 0) return null
    const newest = snapshots[snapshots.length - 1].month
    const baseline = [...snapshots]
      .reverse()
      .find((s) => monthsBetween(s.month, newest) >= 12)
    if (!baseline) return null
    const from = totalsFromSnapshot(baseline).net
    return { from, diff: totals.net - from }
  }, [snapshots, totals.net])

  const hoverOn = hover >= 0 && hover < series.length
  const hoverX = hoverOn ? xAt(hover, series.length, W) : 0

  if (items.length === 0) {
    return <EmptyState onAdd={() => openAdd()} />
  }

  const denom = totals.assets || 1

  return (
    <div style={{ animation: 'nwIn .3s ease both' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: '.16em',
            textTransform: 'uppercase',
            color: 'var(--nw-faint)',
          }}
        >
          Total net worth
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: '.1em',
            color: 'var(--nw-faint)',
          }}
        >
          · as of {formatLongDate(new Date())}
        </div>
      </div>

      <div
        style={{
          fontFamily: MONO,
          fontWeight: 500,
          fontSize: 'clamp(42px,9.5vw,94px)',
          lineHeight: 1,
          letterSpacing: '-.045em',
          margin: '16px 0 0',
        }}
      >
        {totals.net < 0 ? '−' : ''}
        {fmt(totals.net)}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          marginTop: 14,
          flexWrap: 'wrap',
        }}
      >
        {delta ? (
          <>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 'clamp(14px,2.5vw,16px)',
                color: delta.diff >= 0 ? P.pos : P.neg,
              }}
            >
              {delta.diff >= 0 ? '▲ ' : '▼ '}
              {fmt(delta.diff)}
              {'  '}
              {pctChange(delta.from, totals.net)}
            </div>
            <div style={{ fontSize: 15, color: 'var(--nw-muted)' }}>
              past 12 months
            </div>
          </>
        ) : (
          <div style={{ fontSize: 15, color: 'var(--nw-muted)' }}>
            Change over time appears once you have a year of history.
          </div>
        )}
      </div>

      {/* Goal sits directly under the headline figure: it reframes the number
          above it, and is the first thing a user with a target looks for. */}
      {goal ? (
        <div
          style={{
            marginTop: 'clamp(26px,3.5vw,38px)',
            paddingTop: 24,
            borderTop: '1px solid var(--nw-line)',
          }}
        >
          <GoalProgress
            goal={goal}
            currentNet={totals.net}
            snapshots={snapshots}
            compact
          />
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <Link href="/goal" className="nw-hover-accent" style={{ fontSize: 14.5 }}>
            Set a goal →
          </Link>
        </div>
      )}

      {series.length >= 2 ? (
        <div style={{ marginTop: 'clamp(28px,4vw,46px)', position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 2,
              marginBottom: 12,
            }}
          >
            {RANGES.map((r, i) => (
              <button
                key={r.label}
                type="button"
                onClick={() => {
                  setRangeIdx(i)
                  setHover(-1)
                }}
                aria-pressed={rangeIdx === i}
                className="nw-hover-accent"
                style={{
                  fontFamily: MONO,
                  fontSize: 11.5,
                  letterSpacing: '.1em',
                  padding: '5px 10px',
                  color:
                    rangeIdx === i ? 'var(--nw-fg)' : 'var(--nw-faint)',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>

          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={`Net worth over the last ${series.length} months`}
            style={{
              width: '100%',
              height: 'clamp(180px,29vw,270px)',
              display: 'block',
              overflow: 'visible',
            }}
          >
            {gridLines(H, [0.15, 0.4, 0.65, 0.9]).map((g, i) => (
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
            <path
              d={netPath}
              fill="none"
              stroke={P.invest}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {hoverOn && (
              <line
                x1={hoverX}
                y1="0"
                x2={hoverX}
                y2={H}
                stroke={P.line}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            )}
            <rect
              x="0"
              y="0"
              width={W}
              height={H}
              fill="transparent"
              onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect()
                if (r.width === 0) return
                const idx = Math.round(
                  ((e.clientX - r.left) / r.width) * (series.length - 1)
                )
                setHover(Math.max(0, Math.min(series.length - 1, idx)))
              }}
              onMouseLeave={() => setHover(-1)}
            />
          </svg>

          {hoverOn && (
            <div
              style={{
                position: 'absolute',
                top: 30,
                left: `${((hoverX / W) * 100).toFixed(2)}%`,
                transform: 'translateX(-50%)',
                pointerEvents: 'none',
                background: 'var(--nw-surface)',
                border: '1px solid var(--nw-line)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 11px',
                whiteSpace: 'nowrap',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  letterSpacing: '.12em',
                  color: 'var(--nw-faint)',
                  textTransform: 'uppercase',
                }}
              >
                {formatMonthLabel(series[hover].month)}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 16, marginTop: 3 }}>
                {series[hover].net < 0 ? '−' : ''}
                {fmt(series[hover].net)}
              </div>
            </div>
          )}

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
            <div>{formatMonthLabel(series[0].month)}</div>
            <div>
              {formatMonthLabel(series[Math.floor(series.length / 2)].month)}
            </div>
            <div>{formatMonthLabel(series[series.length - 1].month)}</div>
          </div>
        </div>
      ) : (
        <div
          style={{
            marginTop: 'clamp(28px,4vw,46px)',
            padding: '28px 0',
            borderTop: '1px solid var(--nw-line)',
            color: 'var(--nw-muted)',
            fontSize: 15,
          }}
        >
          History starts today. Your net worth is recorded once a month — the
          chart appears here from your second month onward.
        </div>
      )}

      <div style={{ marginTop: 'clamp(36px,5vw,60px)' }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: '.16em',
            textTransform: 'uppercase',
            color: 'var(--nw-faint)',
            marginBottom: 14,
          }}
        >
          Composition
        </div>

        <div style={{ display: 'flex', height: 8, gap: 2 }}>
          {ASSET_CATS.map((c) => {
            const pct = Math.min(100, (totals[c.id] / denom) * 100)
            return (
              <div
                key={c.id}
                style={{
                  flex: '0 0 auto',
                  width: `calc(${pct.toFixed(2)}% - 2px)`,
                  background: P[c.id],
                  borderRadius: 'var(--radius-sm)',
                  transition: 'width .5s cubic-bezier(.4,0,.2,1)',
                }}
              />
            )
          })}
        </div>
        <div style={{ display: 'flex', height: 4, marginTop: 5 }}>
          <div
            style={{
              flex: '0 0 auto',
              width: `calc(${Math.min(100, (totals.liab / denom) * 100).toFixed(2)}% - 2px)`,
              background: P.liab,
              borderRadius: 'var(--radius-sm)',
              opacity: 0.8,
              transition: 'width .5s cubic-bezier(.4,0,.2,1)',
            }}
          />
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 10.5,
            letterSpacing: '.08em',
            color: 'var(--nw-faint)',
            marginTop: 8,
          }}
        >
          {fmt(totals.liab)} owed ·{' '}
          {((totals.liab / denom) * 100).toFixed(1)}% of assets
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))',
            gap: 'clamp(20px,3vw,36px)',
            marginTop: 'clamp(28px,4vw,42px)',
          }}
        >
          {CATS.map((c) => {
            const count = items.filter((i) => i.cat === c.id).length
            const pct = (totals[c.id] / denom) * 100
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => router.push(`/category/${c.id}`)}
                className="nw-cat-card"
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 'var(--radius-sm)',
                      background: P[c.id],
                    }}
                  />
                  <div style={{ fontSize: 15, color: 'var(--nw-muted)' }}>
                    {c.name}
                  </div>
                  <div
                    style={{
                      marginLeft: 'auto',
                      fontFamily: MONO,
                      fontSize: 11,
                      color: 'var(--nw-faint)',
                    }}
                  >
                    {count} {count === 1 ? 'item' : 'items'}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 'clamp(21px,3.2vw,26px)',
                    letterSpacing: '-.03em',
                    marginTop: 14,
                  }}
                >
                  {c.id === 'liab' && totals.liab > 0 ? '−' : ''}
                  {fmt(totals[c.id])}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 11.5,
                    color: 'var(--nw-faint)',
                    marginTop: 8,
                  }}
                >
                  {pct.toFixed(1)}% of assets
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <InsightStrip insights={insights} />
    </div>
  )
}
