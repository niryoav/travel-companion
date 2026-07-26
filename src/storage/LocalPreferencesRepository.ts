import type {
  PreferencesRepository,
  TravelerProfile,
} from './PreferencesRepository'

const TRAVELER_PROFILE_KEY = 'travel-companion:traveler-profile'

export class LocalPreferencesRepository implements PreferencesRepository {
  constructor(private readonly storage: Storage) {}

  getTravelerProfile(): TravelerProfile | null {
    try {
      const value = this.storage.getItem(TRAVELER_PROFILE_KEY)
      return value === 'Yoav' || value === 'Isabel' ? value : null
    } catch {
      return null
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
