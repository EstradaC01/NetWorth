'use client'

import { useActionState, useMemo, useState, useTransition } from 'react'
import { clearGoal, saveGoal, type GoalFormState } from '@/app/actions/goals'
import { GoalProgress } from '@/components/goal-progress'
import { centsToInput } from '@/lib/money'
import { type Goal } from '@/lib/goals'
import { totalsFrom, type Item, type Snapshot } from '@/lib/types'

const MONO = "'IBM Plex Mono',monospace"
const initial: GoalFormState = { error: null }

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

export function GoalView({
  goal,
  items,
  snapshots,
}: {
  goal: Goal | null
  items: Item[]
  snapshots: Snapshot[]
}) {
  const [result, formAction, pending] = useActionState(saveGoal, initial)
  const [clearing, startClearing] = useTransition()
  const [clearError, setClearError] = useState<string | null>(null)

  const totals = useMemo(() => totalsFrom(items), [items])

  const onClear = () => {
    setClearError(null)
    startClearing(async () => {
      const res = await clearGoal()
      if (res.error) setClearError(res.error)
    })
  }

  return (
    <div style={{ animation: 'nwIn .28s ease both', maxWidth: 620 }}>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: '.16em',
          textTransform: 'uppercase',
          color: 'var(--nw-faint)',
        }}
      >
        Your goal
      </div>

      {goal ? (
        <div style={{ marginTop: 26 }}>
          <GoalProgress
            goal={goal}
            currentNet={totals.net}
            snapshots={snapshots}
          />
          {goal.note && (
            <div
              style={{
                marginTop: 18,
                paddingLeft: 14,
                borderLeft: '2px solid var(--nw-line)',
                fontSize: 15.5,
                color: 'var(--nw-muted)',
                lineHeight: 1.5,
              }}
            >
              {goal.note}
            </div>
          )}
        </div>
      ) : (
        <p
          style={{
            fontSize: 17,
            lineHeight: 1.5,
            color: 'var(--nw-muted)',
            margin: '20px 0 0',
            maxWidth: '46ch',
            textWrap: 'pretty',
          }}
        >
          Set a number to aim at. Once you have two months of readings, your
          own recorded pace is used to estimate when you would reach it —
          nothing is assumed about what you save.
        </p>
      )}

      <div
        style={{
          marginTop: 40,
          paddingTop: 30,
          borderTop: '1px solid var(--nw-line)',
        }}
      >
        <div style={{ fontSize: 19, letterSpacing: '-.02em' }}>
          {goal ? 'Change your goal' : 'Set a goal'}
        </div>

        {/* Remounted whenever the saved goal changes, so defaultValue picks up
            the new row rather than keeping what was typed before. */}
        <form
          action={formAction}
          key={goal ? `${goal.target_cents}-${goal.target_date}` : 'none'}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              marginTop: 22,
            }}
          >
            <label style={{ display: 'block' }}>
              <Label>Target net worth (PHP)</Label>
              <input
                name="target"
                inputMode="decimal"
                required
                defaultValue={goal ? centsToInput(goal.target_cents) : ''}
                placeholder="5000000"
                className="nw-input"
                style={{
                  fontFamily: MONO,
                  fontSize: 19,
                  letterSpacing: '-.02em',
                }}
              />
            </label>

            <label style={{ display: 'block' }}>
              <Label>
                By{' '}
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
                name="target_date"
                type="date"
                defaultValue={goal?.target_date ?? ''}
                className="nw-input"
                style={{ fontFamily: MONO, fontSize: 15 }}
              />
            </label>

            <label style={{ display: 'block' }}>
              <Label>
                Why{' '}
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
                name="note"
                maxLength={200}
                defaultValue={goal?.note ?? ''}
                placeholder="Deposit on a place in Quezon City"
                className="nw-input"
              />
            </label>
          </div>

          {(result.error || clearError) && (
            <div
              role="alert"
              style={{
                marginTop: 16,
                fontSize: 13.5,
                color: 'var(--color-accent-2-600)',
              }}
            >
              {result.error ?? clearError}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              marginTop: 26,
            }}
          >
            <button
              type="submit"
              className="nw-btn-primary"
              disabled={pending}
              style={{ fontSize: 14.5, padding: '10px 20px' }}
            >
              {pending ? 'Saving…' : goal ? 'Save goal' : 'Set goal'}
            </button>

            {goal && (
              <button
                type="button"
                onClick={onClear}
                disabled={clearing}
                className="nw-hover-danger"
                style={{
                  marginLeft: 'auto',
                  fontSize: 13.5,
                  padding: '10px 12px',
                  color: 'var(--nw-faint)',
                }}
              >
                {clearing ? 'Removing…' : 'Remove goal'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
