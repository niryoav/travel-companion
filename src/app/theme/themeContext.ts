import { createContext } from 'react'

import type { ThemePreference } from '../../storage/PreferencesRepository'

export interface ThemeContextValue {
  theme: ThemePreference
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
