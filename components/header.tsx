'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggleIcon } from '@/components/theme-toggle'
import { useItemModal } from '@/components/item-modal-context'

export function Header() {
  const pathname = usePathname()
  const { openAdd } = useItemModal()
  const onHistory = pathname.startsWith('/history')

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: 'var(--nw-bg)',
        borderBottom: '1px solid var(--nw-hair)',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '14px clamp(14px,4vw,40px)',
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(8px,2vw,20px)',
          flexWrap: 'wrap',
        }}
      >
        <Link
          href="/dashboard"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            marginRight: 'auto',
            color: 'inherit',
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              background: 'var(--color-accent)',
              borderRadius: 'var(--radius-sm)',
            }}
          />
          <div style={{ fontSize: 18, letterSpacing: '-.02em' }}>NetWorth</div>
        </Link>

        <nav
          style={{
            display: 'flex',
            gap: 'clamp(2px,1vw,4px)',
            alignItems: 'center',
            minWidth: 0,
          }}
        >
          <Link
            href="/dashboard"
            aria-current={!onHistory ? 'page' : undefined}
            className="nw-hover-accent"
            style={{
              padding: '7px 11px',
              fontSize: 15,
              color: onHistory ? 'var(--nw-muted)' : 'var(--nw-fg)',
            }}
          >
            Dashboard
          </Link>
          <Link
            href="/history"
            aria-current={onHistory ? 'page' : undefined}
            className="nw-hover-accent"
            style={{
              padding: '7px 11px',
              fontSize: 15,
              color: onHistory ? 'var(--nw-fg)' : 'var(--nw-muted)',
            }}
          >
            History
          </Link>

          <ThemeToggleIcon />

          <button
            type="button"
            onClick={() => openAdd()}
            className="nw-btn-primary"
            style={{
              marginLeft: 6,
              fontSize: 14,
              padding: '9px 15px',
            }}
          >
            Add item
          </button>

          {/* POST, not a link: a GET sign-out can be fired by a prefetch. */}
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              className="nw-hover-danger"
              style={{
                padding: '7px 9px',
                fontSize: 13.5,
                color: 'var(--nw-faint)',
              }}
            >
              Sign out
            </button>
          </form>
        </nav>
      </div>
    </div>
  )
}
