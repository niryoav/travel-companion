import { describe, expect, it } from 'vitest'

import { tripFixture } from '../test/fixtures/tripFixture'
import { selectStartupPath } from './selectStartupPath'

describe('selectStartupPath', () => {
  it('opens Home before the trip in the home time zone', () => {
    expect(
      selectStartupPath(
        tripFixture,
        new Date('2030-05-09T21:59:59Z'),
      ),
    ).toBe('/home')
  })

  it('opens Today from the first through final local trip date', () => {
    expect(
      selectStartupPath(
        tripFixture,
        new Date('2030-05-09T22:00:00Z'),
      ),
    ).toBe('/today')
    expect(
      selectStartupPath(
        tripFixture,
        new Date('2030-05-14T21:59:59Z'),
      ),
    ).toBe('/today')
  })

  it('opens Home after the final local trip date', () => {
    expect(
      selectStartupPath(
        tripFixture,
        new Date('2030-05-14T22:00:00Z'),
      ),
    ).toBe('/home')
  })
})
