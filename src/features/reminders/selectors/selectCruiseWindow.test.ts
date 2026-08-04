import { describe, expect, it } from 'vitest'

import type { TripData } from '../../../domain/trip/tripTypes'
import { oceaniaMarina2026TripData } from '../../../trips/oceania-marina-2026/tripData'
import { selectCruiseWindow } from './selectCruiseWindow'

describe('selectCruiseWindow', () => {
  it('starts the evening before the canonical trip start date, so 18:00 Prepare-for-tomorrow the night before departure is included', () => {
    const window = selectCruiseWindow(oceaniaMarina2026TripData)
    expect(window).toEqual({
      startAt: '2026-08-21T15:45:00.000Z', // 17:45 Europe/Brussels (CEST, UTC+2), one day before trip.startDate
      endAt: '2026-09-04T14:00:00.000Z', // 16:00 Europe/Brussels (CEST, UTC+2), on trip.endDate
    })
  })

  it('does not mutate the canonical trip start/end dates', () => {
    selectCruiseWindow(oceaniaMarina2026TripData)
    expect(oceaniaMarina2026TripData.trip.startDate).toBe('2026-08-22')
    expect(oceaniaMarina2026TripData.trip.endDate).toBe('2026-09-04')
  })

  it('returns null when the trip dates cannot be resolved', () => {
    const brokenData: TripData = {
      ...oceaniaMarina2026TripData,
      trip: { ...oceaniaMarina2026TripData.trip, startDate: 'not-a-date' },
    }
    expect(selectCruiseWindow(brokenData)).toBeNull()
  })
})
