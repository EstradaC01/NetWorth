'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import type { ThemeName } from '@/lib/categories'

const STORAGE_KEY = 'nw-theme'

/**
 * Runs before first paint to stamp the saved theme onto <html>, so a dark-mode
 * user never sees a flash of the light palette. Kept in sync with the reads in
 * ThemeProvider below.
 */
export const THEME_BOOTSTRAP = `
(function(){try{
  var t = localStorage.getItem('${STORAGE_KEY}');
  if(t!=='dark'&&t!=='light'){
    t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-nw-theme', t);
}catch(e){}})();
`

type ThemeContextValue = {
  theme: ThemeName
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always render 'light' on the server and for the first client render, so
  // the markup matches. The real value is adopted in the effect below; the
  // bootstrap script has already painted the correct colours by then.
  const [theme, setTheme] = useState<ThemeName>('light')

  useEffect(() => {
    const attr = document.documentElement.getAttribute('data-nw-theme')
    if (attr === 'dark' || attr === 'light') setTheme(attr)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: ThemeName = prev === 'light' ? 'dark' : 'light'
      document.documentElement.setAttribute('data-nw-theme', next)
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // Private browsing with storage disabled — the theme still applies
        // for this session, it just will not be remembered.
      }
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
