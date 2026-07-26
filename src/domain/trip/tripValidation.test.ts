import { describe, expect, it } from 'vitest'

import { tripFixture } from '../../test/fixtures/tripFixture'
import { validateTripData } from './tripValidation'

describe('validateTripData', () => {
  it('accepts valid contiguous trip-day windows', () => {
    expect(validateTripData(tripFixture)).toEqual([])
  })

  it('reports broken entity references', () => {
    const invalid = {
      ...tripFixture,
      trip: {
        ...tripFixture.trip,
        travelerIds: ['traveler-missing'],
      },
    }

    expect(validateTripData(invalid)).toContain(
      'Unknown trip traveler: traveler-missing',
    )
  })

  it('rejects a gap between consecutive trip-day windows', () => {
    const invalid = {
      ...tripFixture,
      days: tripFixture.days.map((day, index) =>
        index === 1
          ? { ...day, startsAt: '2030-05-10T23:00:00Z' }
          : day,
      ),
    }

    expect(validateTripData(invalid)).toContain(
      'Gap between trip-day windows: day-2030-05-10 -> day-2030-05-11',
    )
  })

  it('rejects overlapping consecutive trip-day windows', () => {
    const invalid = {
      ...tripFixture,
      days: tripFixture.days.map((day, index) =>
        index === 1
          ? { ...day, startsAt: '2030-05-10T21:00:00Z' }
          : day,
      ),
    }

    expect(validateTripData(invalid)).toContain(
      'Overlapping trip-day windows: day-2030-05-10 -> day-2030-05-11',
    )
  })

  it('rejects out-of-order trip-day windows', () => {
    const invalid = {
      ...tripFixture,
      days: [
        tripFixture.days[1],
        tripFixture.days[0],
        ...tripFixture.days.slice(2),
      ],
    }

    expect(validateTripData(invalid)).toContain(
      'Unsorted trip-day window: day-2030-05-10',
    )
  })
})
