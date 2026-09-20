import { describe, expect, it } from 'vitest'

import { BundledTripContentRepository } from '../data/content/BundledTripContentRepository'
import { BundledTripRepository } from '../data/trips/BundledTripRepository'
import { activeTripConfiguration } from './activeTrip'

describe('activeTripConfiguration', () => {
  it('keeps bundled trip data and editorial content aligned', () => {
    const { tripData, tripContent } = activeTripConfiguration

    expect(tripContent.tripId).toBe(tripData.trip.id)
    expect(new BundledTripRepository(tripData).getActiveTrip()).toBe(tripData)
    expect(
      new BundledTripContentRepository(
        tripContent,
        tripData,
      ).getContentForTrip(tripData.trip.id),
    ).toBe(tripContent)
  })

  it('keeps the active cruise ship and itinerary inside TripData', () => {
    const { tripData } = activeTripConfiguration
    const cruise = tripData.cruises.find(
      ({ id }) => id === tripData.trip.cruiseId,
    )

    expect(cruise).toBeDefined()
    expect(cruise?.shipName.trim()).not.toBe('')
    expect(cruise?.portCallIds.length).toBeGreaterThan(0)
  })
})
