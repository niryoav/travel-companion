import { useEffect, useMemo, useState, type ReactNode } from 'react'

import type {
  PreferencesRepository,
  ThemePreference,
} from '../../storage/PreferencesRepository'
import { ThemeContext } from './themeContext'

interface ThemeProviderProps {
  children: ReactNode
  repository: PreferencesRepository
}

function preferredTheme(): ThemePreference {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function ThemeProvider({
  children,
  repository,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<ThemePreference>(
    () => repository.getTheme() ?? preferredTheme(),
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#122522' : '#f6f4ef')
  }, [theme])

  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () => {
        const nextTheme = theme === 'light' ? 'dark' : 'light'
        repository.setTheme(nextTheme)
        setTheme(nextTheme)
      },
    }),
    [repository, theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
