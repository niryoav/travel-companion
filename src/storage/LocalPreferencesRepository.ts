import type {
  PreferencesRepository,
  ThemePreference,
  TravelerProfile,
} from './PreferencesRepository'

const THEME_KEY = 'travel-companion:theme'
const TRAVELER_PROFILE_KEY = 'travel-companion:traveler-profile'

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

  getTravelerProfile(): TravelerProfile | null {
    try {
      const value = this.storage.getItem(TRAVELER_PROFILE_KEY)
      return value === 'Yoav' || value === 'Isabel' ? value : null
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

  setTravelerProfile(traveler: TravelerProfile): void {
    try {
      this.storage.setItem(TRAVELER_PROFILE_KEY, traveler)
    } catch {
      // The profile still applies for this session when storage is unavailable.
    }
  }
}
