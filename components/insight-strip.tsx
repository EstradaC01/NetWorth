'use client'

import { useTheme } from '@/components/theme'
import { PALETTE } from '@/lib/categories'
import type { Insight } from '@/lib/insights'

const MONO = "'IBM Plex Mono',monospace"

/**
 * The row of derived observations under the dashboard chart.
 *
 * Renders nothing at all when there are no insights, rather than an empty
 * heading — a thin portfolio should look uncluttered, not broken.
 */
export function InsightStrip({ insights }: { insights: Insight[] }) {
  const { theme } = useTheme()
  const P = PALETTE[theme]

  if (insights.length === 0) return null

  const colourFor = (tone: Insight['tone']) =>
    tone === 'good' ? P.pos : tone === 'bad' ? P.neg : 'var(--nw-fg)'

  return (
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
        Observations
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))',
          gap: 'clamp(16px,2.5vw,28px)',
        }}
      >
        {insights.map((ins) => (
          <div
            key={ins.id}
            style={{
              borderTop: '1px solid var(--nw-line)',
              paddingTop: 14,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 10.5,
                letterSpacing: '.13em',
                textTransform: 'uppercase',
                color: 'var(--nw-faint)',
              }}
            >
              {ins.label}
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 'clamp(20px,3vw,25px)',
                letterSpacing: '-.03em',
                marginTop: 12,
                color: colourFor(ins.tone),
              }}
            >
              {ins.value}
            </div>
            <div
              style={{
                fontSize: 13.5,
                color: 'var(--nw-muted)',
                marginTop: 8,
                lineHeight: 1.45,
                textWrap: 'pretty',
              }}
            >
              {ins.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
