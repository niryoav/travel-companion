import type { TravelerId, TripId } from '../domain/trip/tripTypes'

export interface StoredTripState {
  schemaVersion: 1
  activeTripId: TripId
  travelerId?: TravelerId
}

export interface TripStateRepository {
  getTravelerId(): TravelerId | null
  setTravelerId(travelerId: TravelerId): void
}
