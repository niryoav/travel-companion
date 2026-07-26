export type AppearancePreference = 'day-ocean' | 'night-ocean' | 'system'
export type TravelerProfile = 'Isabel' | 'Yoav'

export interface PreferencesRepository {
  getAppearance(): AppearancePreference | null
  getTravelerProfile(): TravelerProfile | null
  setAppearance(appearance: AppearancePreference): void
  setTravelerProfile(traveler: TravelerProfile): void
}
