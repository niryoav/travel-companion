import type { TripData, TripId } from '../../domain/trip/tripTypes'

export interface TripRepository {
  getActiveTrip(): TripData
  getTrip(id: TripId): TripData | null
}
