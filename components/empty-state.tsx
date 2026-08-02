'use client'

const MONO = "'IBM Plex Mono',monospace"

/** Shown on a brand-new account, in place of the dashboard's zeroed figures. */
export function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{ animation: 'nwIn .3s ease both', maxWidth: '46ch' }}>
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
          fontWeight: 500,
          fontSize: 'clamp(42px,9.5vw,94px)',
          lineHeight: 1,
          letterSpacing: '-.045em',
          margin: '16px 0 0',
          color: 'var(--nw-faint)',
        }}
      >
        ₱0
      </div>

      <p
        style={{
          fontSize: 17,
          lineHeight: 1.5,
          color: 'var(--nw-muted)',
          margin: '24px 0 0',
          textWrap: 'pretty',
        }}
      >
        Add your accounts, investments, property and debts — everything is
        totalled in pesos, and your net worth is recorded once a month so you
        can watch it move.
      </p>

      <button
        type="button"
        onClick={onAdd}
        className="nw-btn-primary"
        style={{ marginTop: 28, padding: '12px 20px', fontSize: 15 }}
      >
        Add your first item
      </button>
    </div>
  )
}
