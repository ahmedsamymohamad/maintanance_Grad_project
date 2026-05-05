'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const current = mounted ? (theme === 'system' ? resolvedTheme : theme) : 'light'
  const isDark = current === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="h-10 w-10 rounded-full border border-slate-200/60 bg-white/70 hover:bg-slate-100 text-slate-700 dark:border-slate-700/60 dark:bg-slate-800/70 dark:hover:bg-slate-700 dark:text-slate-200"
    >
      {mounted ? (
        isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5 opacity-0" />
      )}
    </Button>
  )
}
