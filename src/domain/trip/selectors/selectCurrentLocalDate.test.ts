import { describe, expect, it } from 'vitest'

import { tripFixture } from '../../../test/fixtures/tripFixture'
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
})
