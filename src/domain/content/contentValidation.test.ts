import { describe, expect, it } from 'vitest'

import { tripContentFixture } from '../../test/fixtures/tripContentFixture'
import { tripFixture } from '../../test/fixtures/tripFixture'
import type { TripContentBundle } from './contentTypes'
import { validateTripContent } from './contentValidation'

describe('validateTripContent', () => {
  it('accepts the privacy-safe content fixture', () => {
    expect(validateTripContent(tripContentFixture, tripFixture)).toEqual(
      [],
    )
  })

  it('rejects unknown destination and excursion relationships', () => {
    const content: TripContentBundle = {
      ...tripContentFixture,
      destinationGuides: [
        {
          ...tripContentFixture.destinationGuides[0],
          locationId: 'location-unknown',
        },
      ],
      excursionGuides: [
        {
          ...tripContentFixture.excursionGuides[0],
          eventId: 'event-flight-outbound',
        },
      ],
    }

    expect(validateTripContent(content, tripFixture)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Unknown destination location'),
        expect.stringContaining('not an excursion'),
      ]),
    )
  })

  it('rejects missing content, sources, and invalid review dates', () => {
    const content: TripContentBundle = {
      ...tripContentFixture,
      destinationGuides: [
        {
          ...tripContentFixture.destinationGuides[0],
          introduction: ' ',
          sourceReferences: [],
          reviewedAt: '2030-99-99',
        },
      ],
    }
    const errors = validateTripContent(content, tripFixture)

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Missing destination content'),
        expect.stringContaining('Missing content sources'),
        expect.stringContaining('Invalid destination review date'),
      ]),
    )
  })

  it('rejects duplicate guide IDs and ambiguous relationships', () => {
    const destination = tripContentFixture.destinationGuides[0]
    const excursion = tripContentFixture.excursionGuides[0]
    const content: TripContentBundle = {
      ...tripContentFixture,
      destinationGuides: [
        destination,
        { ...destination, id: excursion.id },
      ],
      excursionGuides: [excursion],
    }

    expect(validateTripContent(content, tripFixture)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Duplicate content ID'),
        expect.stringContaining('Duplicate destination location'),
      ]),
    )
  })

  it('validates local WebP image metadata and 16:9 dimensions', () => {
    const guide = tripContentFixture.destinationGuides[0]
    const valid: TripContentBundle = {
      ...tripContentFixture,
      destinationGuides: [
        {
          ...guide,
          image: {
            src: '/images/fixtures/fictional-harbor.webp',
            alt: 'A fictional harbor beneath a clear sky',
            width: 1200,
            height: 675,
          },
        },
      ],
    }
    const invalid: TripContentBundle = {
      ...valid,
      destinationGuides: [
        {
          ...valid.destinationGuides[0],
          image: {
            ...valid.destinationGuides[0].image!,
            alt: '',
            width: 1200,
            height: 800,
          },
        },
      ],
    }

    expect(validateTripContent(valid, tripFixture)).toEqual([])
    expect(validateTripContent(invalid, tripFixture)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Missing destination image alt text'),
        expect.stringContaining('must use 16:9'),
      ]),
    )
  })

  it('accepts summary-only excursion content and validates optional sections', () => {
    const guide = tripContentFixture.excursionGuides[0]
    const summaryOnly: TripContentBundle = {
      ...tripContentFixture,
      excursionGuides: [
        {
          ...guide,
          highlights: undefined,
          context: undefined,
        },
      ],
    }
    const invalid: TripContentBundle = {
      ...tripContentFixture,
      excursionGuides: [
        {
          ...guide,
          lookOutFor: [''],
          seasonalNote: ' ',
        },
      ],
    }

    expect(validateTripContent(summaryOnly, tripFixture)).toEqual([])
    expect(validateTripContent(invalid, tripFixture)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Invalid excursion look-out-for items'),
        expect.stringContaining('Invalid excursion supporting content'),
      ]),
    )
  })
})
