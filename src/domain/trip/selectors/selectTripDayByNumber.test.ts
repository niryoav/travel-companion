import { describe, expect, it } from 'vitest'

import { oceaniaMarina2026TripData } from '../../../trips/oceania-marina-2026/tripData'
import { selectTripDayByNumber } from './selectTripDayByNumber'

describe('selectTripDayByNumber', () => {
  it('resolves day 1 to the Reykjavik embarkation day', () => {
    const day = selectTripDayByNumber(oceaniaMarina2026TripData, 1)
    expect(day?.id).toBe('day-2026-08-22')
  })

  it('resolves a middle day using the same canonical ordering as the rest of the app', () => {
    const day = selectTripDayByNumber(oceaniaMarina2026TripData, 4)
    expect(day?.id).toBe('day-2026-08-25')
    expect(day?.title).toBe('Húsavík')
  })

  it('resolves the final day', () => {
    const day = selectTripDayByNumber(oceaniaMarina2026TripData, 14)
    expect(day?.id).toBe('day-2026-09-04')
  })

  it('returns null for a day number outside the trip', () => {
    expect(selectTripDayByNumber(oceaniaMarina2026TripData, 0)).toBeNull()
    expect(selectTripDayByNumber(oceaniaMarina2026TripData, 15)).toBeNull()
  })
})
