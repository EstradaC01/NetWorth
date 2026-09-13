'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/theme'
import { Button } from '@/components/ui/button'

export function ThemeToggleLink() {
  const { theme, toggleTheme } = useTheme()
  return <button type="button" onClick={toggleTheme} className="nw-hover-accent" style={{ marginTop: 20, padding: '6px 0', fontSize: 13.5, color: 'var(--nw-muted)' }}>{theme === 'light' ? 'Switch to dark' : 'Switch to light'}</button>
}

/** A labelled shadcn control so the available appearance is always explicit. */
export function ThemeToggleIcon() {
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'
  const label = isLight ? 'Switch to dark mode' : 'Switch to light mode'
  return <Button type="button" onClick={toggleTheme} title={label} aria-label={label} variant="outline" size="icon" className="nw-theme-toggle">{isLight ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}</Button>
}
