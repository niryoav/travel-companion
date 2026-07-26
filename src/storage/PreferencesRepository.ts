export type TravelerProfile = 'Isabel' | 'Yoav'

export interface PreferencesRepository {
  getTravelerProfile(): TravelerProfile | null
  setTravelerProfile(traveler: TravelerProfile): void
}
