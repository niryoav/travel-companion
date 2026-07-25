import type {
  PreferencesRepository,
  ThemePreference,
} from './PreferencesRepository'

const THEME_KEY = 'travel-companion:theme'

export class LocalPreferencesRepository implements PreferencesRepository {
  constructor(private readonly storage: Storage) {}

  getTheme(): ThemePreference | null {
    try {
      const value = this.storage.getItem(THEME_KEY)
      return value === 'light' || value === 'dark' ? value : null
    } catch {
      return null
    }
  }

  setTheme(theme: ThemePreference): void {
    try {
      this.storage.setItem(THEME_KEY, theme)
    } catch {
      // The visual preference still applies for this session when storage is
      // unavailable, for example in a restricted private browsing context.
    }
  }
}
