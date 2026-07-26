import { describe, expect, it } from 'vitest'

import { tripFixture } from '../../test/fixtures/tripFixture'
import { validateTripData } from './tripValidation'

describe('validateTripData', () => {
  it('accepts the privacy-safe trip fixture', () => {
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
})
