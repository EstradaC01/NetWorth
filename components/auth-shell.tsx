import Link from 'next/link'

const MONO = "'IBM Plex Mono',monospace"

/**
 * The split-screen frame shared by sign-in and sign-up, ported from the
 * prototype's login view. Left panel is the pitch, right holds the form.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))',
        animation: 'nwFade .3s ease both',
      }}
    >
      <div
        style={{
          padding: 'clamp(40px,7vw,88px) clamp(24px,6vw,72px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 48,
          borderRight: '1px solid var(--nw-hair)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 11,
              height: 11,
              background: 'var(--color-accent)',
              borderRadius: 'var(--radius-sm)',
            }}
          />
          <div style={{ fontSize: 19, letterSpacing: '-.02em' }}>NetWorth</div>
        </div>
        <div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: '.16em',
              textTransform: 'uppercase',
              color: 'var(--nw-faint)',
            }}
          >
            Every peso, one page
          </div>
          <h1
            style={{
              fontSize: 'clamp(34px,5.2vw,58px)',
              lineHeight: 1.06,
              letterSpacing: '-.02em',
              margin: '18px 0 0',
              maxWidth: '12ch',
            }}
          >
            Know exactly where you stand.
          </h1>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.5,
              color: 'var(--nw-muted)',
              margin: '20px 0 0',
              maxWidth: '34ch',
              textWrap: 'pretty',
            }}
          >
            Cash, investments, property and debt — totalled in pesos, tracked
            month by month.
          </p>
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: '.1em',
            color: 'var(--nw-faint)',
          }}
        >
          ₱ · MANILA · 2026
        </div>
      </div>

      <div
        style={{
          padding: 'clamp(40px,7vw,88px) clamp(24px,6vw,72px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: '100%', maxWidth: 360 }}>{children}</div>
      </div>
    </div>
  )
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
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

export function AuthSwitch({
  prompt,
  href,
  label,
}: {
  prompt: string
  href: string
  label: string
}) {
  return (
    <p style={{ color: 'var(--nw-muted)', fontSize: 15, margin: '10px 0 30px' }}>
      {prompt}{' '}
      <Link href={href} style={{ color: 'var(--color-accent)' }}>
        {label}
      </Link>
    </p>
  )
}
