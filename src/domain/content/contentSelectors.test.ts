import { describe, expect, it } from 'vitest'

import { tripContentFixture } from '../../test/fixtures/tripContentFixture'
import {
  selectDestinationGuide,
  selectExcursionGuide,
} from './contentSelectors'

describe('content selectors', () => {
  it('resolves a destination guide by location ID', () => {
    expect(
      selectDestinationGuide(
        tripContentFixture,
        'location-harbor-terminal',
      )?.id,
    ).toBe('destination-guide-harbor-city')
  })

  it('resolves an excursion guide by event ID', () => {
    expect(
      selectExcursionGuide(tripContentFixture, 'event-excursion')?.id,
    ).toBe('excursion-guide-coastal-walk')
  })

  it('returns no guide for missing or unknown relationships', () => {
    expect(
      selectDestinationGuide(tripContentFixture, 'location-unknown'),
    ).toBeNull()
    expect(
      selectDestinationGuide(tripContentFixture, undefined),
    ).toBeNull()
    expect(
      selectExcursionGuide(tripContentFixture, 'event-unknown'),
    ).toBeNull()
    expect(selectExcursionGuide(tripContentFixture, undefined)).toBeNull()
  })
})
