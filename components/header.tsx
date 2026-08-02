'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggleIcon } from '@/components/theme-toggle'
import { useItemModal } from '@/components/item-modal-context'
import { Logo } from '@/components/logo'

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/history', label: 'History' },
  { href: '/goal', label: 'Goal' },
] as const

export function Header() {
  const pathname = usePathname()
  const { openAdd } = useItemModal()

  // /dashboard is the fallback for anything not otherwise matched — notably
  // /category/*, which is reached from the dashboard and belongs to it.
  const active =
    NAV.find((n) => n.href !== '/dashboard' && pathname.startsWith(n.href))
      ?.href ?? '/dashboard'

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
          <span style={{ color: 'var(--color-accent)' }}>
            <Logo size={24} />
          </span>
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
          {NAV.map((n) => {
            const on = active === n.href
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={on ? 'page' : undefined}
                className="nw-hover-accent"
                style={{
                  padding: '7px 11px',
                  fontSize: 15,
                  color: on ? 'var(--nw-fg)' : 'var(--nw-muted)',
                }}
              >
                {n.label}
              </Link>
            )
          })}

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
