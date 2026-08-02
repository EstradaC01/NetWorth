'use client'

import { useTheme } from '@/components/theme'
import { PALETTE } from '@/lib/categories'
import { fmt } from '@/lib/money'
import { currentMonthKey, formatTargetMonth } from '@/lib/dates'
import {
  goalProgress,
  monthlyRate,
  paceVerdict,
  projectArrival,
  type Goal,
} from '@/lib/goals'
import { totalsFromSnapshot, type Snapshot } from '@/lib/types'

const MONO = "'IBM Plex Mono',monospace"

/**
 * Goal meter plus the honest projection beneath it.
 *
 * Shared by the dashboard (compact) and the goal page (full), because the two
 * were going to drift apart otherwise — and a projection that disagrees with
 * itself across two screens is worse than not showing one.
 */
export function GoalProgress({
  goal,
  currentNet,
  snapshots,
  compact = false,
}: {
  goal: Goal
  currentNet: number
  snapshots: Snapshot[]
  compact?: boolean
}) {
  const { theme } = useTheme()
  const P = PALETTE[theme]

  // The anchor is the earliest reading the user actually recorded; with no
  // history at all, progress is measured from zero.
  const start =
    snapshots.length > 0 ? totalsFromSnapshot(snapshots[0]).net : 0

  const frac = goalProgress(currentNet, goal.target_cents, start)
  const rate = monthlyRate(snapshots)
  const thisMonth = currentMonthKey()
  const projection = projectArrival(
    currentNet,
    goal.target_cents,
    rate,
    thisMonth
  )
  const pace = paceVerdict(projection, goal.target_date, thisMonth)
  const reached = currentNet >= goal.target_cents

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
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
          Goal
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: compact ? 13 : 15,
            color: 'var(--nw-muted)',
          }}
        >
          {goal.target_cents < 0 ? '−' : ''}
          {fmt(goal.target_cents)}
          {goal.target_date && ` by ${formatTargetMonth(goal.target_date)}`}
        </div>
        <div
          style={{
            marginLeft: 'auto',
            fontFamily: MONO,
            fontSize: compact ? 13 : 15,
            color: reached ? P.pos : 'var(--nw-fg)',
          }}
        >
          {(frac * 100).toFixed(0)}%
        </div>
      </div>

      {/* The meter. A single track with a filled portion — the same visual
          grammar as the dashboard's composition bar, so the two read as
          siblings rather than as two different chart languages. */}
      <div
        role="progressbar"
        aria-valuenow={Math.round(frac * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progress toward your net worth goal"
        style={{
          marginTop: 10,
          height: 8,
          borderRadius: 'var(--radius-sm)',
          // A hairline outline rather than a filled track: at 0% a solid grey
          // bar reads as a full meter in a muted colour, which is the exact
          // opposite of what it means.
          border: '1px solid var(--nw-line)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${(frac * 100).toFixed(2)}%`,
            height: '100%',
            background: reached ? P.pos : P.invest,
            borderRadius: 'var(--radius-sm)',
            transition: 'width .5s cubic-bezier(.4,0,.2,1)',
          }}
        />
      </div>

      {/* How much is left, in money. The percentage above is the shape of the
          progress; this is the number the user actually acts on. */}
      {!reached && (
        <div
          style={{
            marginTop: 8,
            fontFamily: MONO,
            fontSize: compact ? 11 : 12,
            letterSpacing: '.06em',
            color: 'var(--nw-faint)',
          }}
        >
          {fmt(goal.target_cents - currentNet)} to go
        </div>
      )}

      <div
        style={{
          marginTop: 10,
          fontSize: compact ? 13.5 : 15,
          color: 'var(--nw-muted)',
          lineHeight: 1.5,
        }}
      >
        {reached ? (
          <>You have reached your goal.</>
        ) : projection ? (
          <>
            At your recorded pace of {rate! >= 0 ? '+' : '−'}
            {fmt(rate!)} a month, you reach it around{' '}
            <span style={{ color: 'var(--nw-fg)' }}>
              {formatTargetMonth(projection.month)}
            </span>
            {pace === 'ahead' && (
              <span style={{ color: P.pos }}> — ahead of your date.</span>
            )}
            {pace === 'behind' && (
              <span style={{ color: P.neg }}> — later than your date.</span>
            )}
            {pace === null && '.'}
          </>
        ) : rate === null ? (
          <>
            A projection needs at least two monthly readings. Yours appears
            once you have a second month of history.
          </>
        ) : (
          <>
            Your recorded trend is not moving toward this target, so there is
            no arrival date to project.
          </>
        )}
      </div>
    </div>
  )
}
