import { describe, expect, it } from 'vitest'

import { tripFixture } from '../../../test/fixtures/tripFixture'
import { oceaniaMarina2026TripData } from '../../../trips/oceania-marina-2026/tripData'
import { selectCurrentLocalDate } from './selectCurrentLocalDate'

describe('selectCurrentLocalDate', () => {
  it('uses the trip home time zone outside configured travel days', () => {
    expect(
      selectCurrentLocalDate(
        tripFixture,
        new Date('2030-05-09T21:59:59Z'),
      ),
    ).toBe('2030-05-09')
    expect(
      selectCurrentLocalDate(
        tripFixture,
        new Date('2030-05-09T22:00:00Z'),
      ),
    ).toBe('2030-05-10')
  })

  it('uses the current travel day time zone during the trip', () => {
    expect(
      selectCurrentLocalDate(
        tripFixture,
        new Date('2030-05-11T12:00:00Z'),
      ),
    ).toBe('2030-05-11')
  })

  it('changes to departure day at Brussels midnight rather than UTC midnight', () => {
    expect(
      selectCurrentLocalDate(
        oceaniaMarina2026TripData,
        new Date('2026-08-21T21:59:59Z'),
      ),
    ).toBe('2026-08-21')
    expect(
      selectCurrentLocalDate(
        oceaniaMarina2026TripData,
        new Date('2026-08-21T22:00:00Z'),
      ),
    ).toBe('2026-08-22')
  })
})
