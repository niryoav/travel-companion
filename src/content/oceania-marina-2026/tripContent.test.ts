import { describe, expect, it } from 'vitest'

import { validateTripContent } from '../../domain/content/contentValidation'
import { oceaniaMarina2026TripData } from '../../trips/oceania-marina-2026/tripData'
import { oceaniaMarina2026TripContent } from './tripContent'

describe('Oceania Marina bundled editorial content', () => {
  it('passes validation against canonical operational data', () => {
    expect(
      validateTripContent(
        oceaniaMarina2026TripContent,
        oceaniaMarina2026TripData,
      ),
    ).toEqual([])
  })

  it('contains only the two source-reviewed independent excursion guides', () => {
    expect(
      oceaniaMarina2026TripContent.excursionGuides.map(
        ({ eventId }) => eventId,
      ),
    ).toEqual([
      'event-husavik-big-whale-safari',
      'event-djupivogur-glacier-lagoon',
    ])
    expect(
      oceaniaMarina2026TripContent.excursionGuides.every(
        ({ verification }) => verification === 'PRIMARY_SOURCE_REVIEWED',
      ),
    ).toBe(true)
  })

  it('records both official Gentle Giants source pages', () => {
    expect(
      oceaniaMarina2026TripContent.excursionGuides[0].sourceReferences,
    ).toHaveLength(2)
  })
})
