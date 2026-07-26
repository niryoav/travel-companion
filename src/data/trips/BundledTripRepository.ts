import { assertValidTripData } from '../../domain/trip/tripValidation'
import type { TripData, TripId } from '../../domain/trip/tripTypes'
import type { TripRepository } from './TripRepository'

export class BundledTripRepository implements TripRepository {
  private readonly tripData: TripData

  constructor(tripData: TripData) {
    this.tripData = assertValidTripData(tripData)
  }

  getActiveTrip(): TripData {
    return this.tripData
  }

  getTrip(id: TripId): TripData | null {
    return id === this.tripData.trip.id ? this.tripData : null
  }
}
