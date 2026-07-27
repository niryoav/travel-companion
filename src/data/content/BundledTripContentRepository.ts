import { assertValidTripContent } from '../../domain/content/contentValidation'
import type { TripContentBundle } from '../../domain/content/contentTypes'
import type { TripData, TripId } from '../../domain/trip/tripTypes'
import type { TripContentRepository } from './TripContentRepository'

export class BundledTripContentRepository
  implements TripContentRepository
{
  private readonly content: TripContentBundle

  constructor(content: TripContentBundle, tripData: TripData) {
    this.content = assertValidTripContent(content, tripData)
  }

  getContentForTrip(tripId: TripId): TripContentBundle | null {
    return tripId === this.content.tripId ? this.content : null
  }
}
