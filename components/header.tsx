'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggleIcon } from '@/components/theme-toggle'
import { useItemModal } from '@/components/item-modal-context'
import { Logo } from '@/components/logo'

const NAV = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/history', label: 'History' },
  { href: '/goal', label: 'Goal' },
] as const

export function Header() {
  const pathname = usePathname()
  const { openAdd } = useItemModal()
  const active = NAV.find((n) => n.href !== '/dashboard' && pathname.startsWith(n.href))?.href ?? '/dashboard'

  return <header className="nw-app-header"><div className="nw-app-header-inner">
    <Link href="/dashboard" className="nw-app-brand"><span><Logo size={25} /></span><strong>NetWorth</strong></Link>
    <nav className="nw-app-nav" aria-label="Main navigation">{NAV.map((n) => <Link key={n.href} href={n.href} aria-current={active === n.href ? 'page' : undefined}>{n.label}</Link>)}</nav>
    <div className="nw-app-actions"><ThemeToggleIcon /><button type="button" onClick={() => openAdd()} className="nw-btn-primary nw-add-item">Add item</button><form action="/auth/sign-out" method="post"><button type="submit" className="nw-sign-out">Sign out</button></form></div>
  </div></header>
}
