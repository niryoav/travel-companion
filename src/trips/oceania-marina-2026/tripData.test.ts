import { describe, expect, it } from 'vitest'

import { validateTripData } from '../../domain/trip/tripValidation'
import { oceaniaMarina2026TripData } from './tripData'

describe('canonical active trip data', () => {
  it('passes the trip-data validation boundary', () => {
    expect(validateTripData(oceaniaMarina2026TripData)).toEqual([])
  })

  it('covers every configured date from departure through the final travel day', () => {
    expect(oceaniaMarina2026TripData.days).toHaveLength(14)
    expect(oceaniaMarina2026TripData.days.at(0)?.localDate).toBe(
      oceaniaMarina2026TripData.trip.startDate,
    )
    expect(oceaniaMarina2026TripData.days.at(-1)?.localDate).toBe(
      oceaniaMarina2026TripData.trip.endDate,
    )
  })
})
