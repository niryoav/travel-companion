import type { TripContentBundle } from '../../domain/content/contentTypes'
import type { TripId } from '../../domain/trip/tripTypes'

export interface TripContentRepository {
  getContentForTrip(tripId: TripId): TripContentBundle | null
}
