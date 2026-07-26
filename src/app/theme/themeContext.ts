import { createContext } from 'react'

import type { AppearancePreference } from '../../storage/PreferencesRepository'

export interface ThemeContextValue {
  appearance: AppearancePreference
  resolvedAppearance: Exclude<AppearancePreference, 'system'>
  setAppearance: (appearance: AppearancePreference) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
