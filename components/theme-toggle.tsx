'use client'

import { useTheme } from '@/components/theme'

/** Text toggle used on the auth screens. */
export function ThemeToggleLink() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="nw-hover-accent"
      style={{
        marginTop: 20,
        padding: '6px 0',
        fontSize: 13.5,
        color: 'var(--nw-muted)',
      }}
    >
      {theme === 'light' ? 'Switch to dark' : 'Switch to light'}
    </button>
  )
}

/** Compact icon toggle used in the app header. */
export function ThemeToggleIcon() {
  const { theme, toggleTheme } = useTheme()
  const label = theme === 'light' ? 'Switch to dark' : 'Switch to light'
  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={label}
      aria-label={label}
      className="nw-btn-icon"
      style={{ width: 34, height: 34, marginLeft: 6, fontSize: 13 }}
    >
      <span aria-hidden="true">{theme === 'light' ? '◐' : '◑'}</span>
    </button>
  )
}
