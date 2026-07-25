export type ThemePreference = 'light' | 'dark'

export interface PreferencesRepository {
  getTheme(): ThemePreference | null
  setTheme(theme: ThemePreference): void
}
