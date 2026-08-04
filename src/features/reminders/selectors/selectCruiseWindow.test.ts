import { describe, expect, it } from 'vitest'

import type { TripData } from '../../../domain/trip/tripTypes'
import { oceaniaMarina2026TripData } from '../../../trips/oceania-marina-2026/tripData'
import { selectCruiseWindow } from './selectCruiseWindow'

describe('selectCruiseWindow', () => {
  it('computes the window from the trip start/end date and home timezone', () => {
    const window = selectCruiseWindow(oceaniaMarina2026TripData)
    expect(window).toEqual({
      startAt: '2026-08-22T07:00:00.000Z', // 09:00 Europe/Brussels (CEST, UTC+2)
      endAt: '2026-09-04T14:00:00.000Z', // 16:00 Europe/Brussels (CEST, UTC+2)
    })
  })

  it('returns null when the trip dates cannot be resolved', () => {
    const brokenData: TripData = {
      ...oceaniaMarina2026TripData,
      trip: { ...oceaniaMarina2026TripData.trip, startDate: 'not-a-date' },
    }
    expect(selectCruiseWindow(brokenData)).toBeNull()
  })
})
