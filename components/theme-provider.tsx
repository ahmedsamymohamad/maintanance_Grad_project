'use client'

import * as React from 'react'
 
type Theme = 'light' | 'dark' | 'system'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
  attribute?: 'class' | 'data-theme'
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
}

type ThemeContextValue = {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)

function getSystemTheme() {
  if (typeof window === 'undefined') {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'theme',
  attribute = 'class',
  enableSystem = true,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme)
  const [systemTheme, setSystemTheme] = React.useState<'light' | 'dark'>('light')

  React.useEffect(() => {
    const stored = window.localStorage.getItem(storageKey)
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      setThemeState(stored)
    }

    setSystemTheme(getSystemTheme())

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => setSystemTheme(getSystemTheme())
    media.addEventListener('change', handleChange)

    return () => media.removeEventListener('change', handleChange)
  }, [storageKey])

  const resolvedTheme =
    theme === 'system' ? (enableSystem ? systemTheme : 'light') : theme

  React.useEffect(() => {
    const root = document.documentElement

    let cleanup: (() => void) | undefined
    if (disableTransitionOnChange) {
      const style = document.createElement('style')
      style.appendChild(
        document.createTextNode(
          '*{transition:none !important;-webkit-transition:none !important;}',
        ),
      )
      document.head.appendChild(style)
      cleanup = () => {
        void root.offsetHeight
        document.head.removeChild(style)
      }
    }

    if (attribute === 'class') {
      root.classList.remove('light', 'dark')
      root.classList.add(resolvedTheme)
    } else {
      root.setAttribute(attribute, resolvedTheme)
    }

    root.style.colorScheme = resolvedTheme

    cleanup?.()
  }, [attribute, disableTransitionOnChange, resolvedTheme])

  const setTheme = React.useCallback(
    (value: Theme) => {
      setThemeState(value)
      window.localStorage.setItem(storageKey, value)
    },
    [storageKey],
  )

  const contextValue = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  )

  return (
    <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = React.useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }

  return context
}
