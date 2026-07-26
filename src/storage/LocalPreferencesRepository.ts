import type {
  AppearancePreference,
  PreferencesRepository,
  TravelerProfile,
} from './PreferencesRepository'

const APPEARANCE_KEY = 'travel-companion:appearance'
const LEGACY_THEME_KEY = 'travel-companion:theme'
const TRAVELER_PROFILE_KEY = 'travel-companion:traveler-profile'

export class LocalPreferencesRepository implements PreferencesRepository {
  constructor(private readonly storage: Storage) {}

  getAppearance(): AppearancePreference | null {
    try {
      const value = this.storage.getItem(APPEARANCE_KEY)

      if (
        value === 'system' ||
        value === 'day-ocean' ||
        value === 'night-ocean'
      ) {
        return value
      }

      const legacyTheme = this.storage.getItem(LEGACY_THEME_KEY)
      if (legacyTheme === 'light') {
        return 'day-ocean'
      }
      if (legacyTheme === 'dark') {
        return 'night-ocean'
      }

      return null
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

  setAppearance(appearance: AppearancePreference): void {
    try {
      this.storage.setItem(APPEARANCE_KEY, appearance)
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
