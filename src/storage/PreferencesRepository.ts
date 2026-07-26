export type ThemePreference = 'light' | 'dark'
export type TravelerProfile = 'Isabel' | 'Yoav'

export interface PreferencesRepository {
  getTheme(): ThemePreference | null
  getTravelerProfile(): TravelerProfile | null
  setTheme(theme: ThemePreference): void
  setTravelerProfile(traveler: TravelerProfile): void
}
