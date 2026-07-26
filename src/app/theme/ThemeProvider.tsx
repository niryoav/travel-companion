import { useEffect, useMemo, useState, type ReactNode } from 'react'

import type {
  AppearancePreference,
  PreferencesRepository,
} from '../../storage/PreferencesRepository'
import { ThemeContext } from './themeContext'

interface ThemeProviderProps {
  children: ReactNode
  repository: PreferencesRepository
}

type ResolvedAppearance = Exclude<AppearancePreference, 'system'>

function systemAppearance(): ResolvedAppearance {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'night-ocean'
    : 'day-ocean'
}

export function ThemeProvider({
  children,
  repository,
}: ThemeProviderProps) {
  const [appearance, setAppearanceState] = useState<AppearancePreference>(
    () => repository.getAppearance() ?? 'system',
  )
  const [systemResolvedAppearance, setSystemResolvedAppearance] =
    useState<ResolvedAppearance>(systemAppearance)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const updateSystemAppearance = () => {
      setSystemResolvedAppearance(
        mediaQuery.matches ? 'night-ocean' : 'day-ocean',
      )
    }

    updateSystemAppearance()
    mediaQuery.addEventListener('change', updateSystemAppearance)

    return () => {
      mediaQuery.removeEventListener('change', updateSystemAppearance)
    }
  }, [])

  const resolvedAppearance =
    appearance === 'system' ? systemResolvedAppearance : appearance

  useEffect(() => {
    document.documentElement.dataset.appearance = resolvedAppearance
    document.documentElement.removeAttribute('data-theme')
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        'content',
        resolvedAppearance === 'night-ocean' ? '#031525' : '#075080',
      )
  }, [resolvedAppearance])

  const value = useMemo(
    () => ({
      appearance,
      resolvedAppearance,
      setAppearance: (nextAppearance: AppearancePreference) => {
        repository.setAppearance(nextAppearance)
        setAppearanceState(nextAppearance)
      },
    }),
    [appearance, repository, resolvedAppearance],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
