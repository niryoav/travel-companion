import { describe, expect, it } from 'vitest'

import { tripFixture } from '../../test/fixtures/tripFixture'
import type { TripData, TripEvent } from './tripTypes'
import { formatRestaurantTitle, mealEventPresentation } from './mealEvents'

function dataWithRestaurant(): TripData {
  const data = structuredClone(tripFixture)
  data.mealRestaurants = [
    {
      id: 'toscana',
      name: 'Toscana',
      location: 'Deck 14',
      deck: 14,
      reservationRequiredForDinner: true,
      extraFee: false,
      services: { DINNER: [{ opensAt: '18:30', closesAt: '21:00' }] },
    },
  ]
  return data
}

describe('formatRestaurantTitle', () => {
  it('appends the deck when known', () => {
    expect(formatRestaurantTitle('Polo Grill', 14)).toBe('Polo Grill · Deck 14')
  })

  it('leaves the name unchanged when the deck is unknown', () => {
    expect(formatRestaurantTitle('Unknown venue', undefined)).toBe(
      'Unknown venue',
    )
  })
})

describe('mealEventPresentation deck matching', () => {
  it('carries the canonical deck for a matched restaurant', () => {
    const data = dataWithRestaurant()
    const event: TripEvent = {
      id: 'dinner', dayId: 'day-2030-05-11', kind: 'MEAL',
      title: 'Dinner', startsAt: '2030-05-11T18:30:00+02:00',
      mealType: 'DINNER', mealRestaurantId: 'toscana',
    }
    expect(mealEventPresentation(data, event)).toMatchObject({
      title: 'Toscana',
      deck: 14,
    })
  })

  it('omits the deck for legacy and unknown venues, and for High Tea', () => {
    const data = dataWithRestaurant()
    const legacyEvent: TripEvent = {
      id: 'legacy', dayId: 'day-2030-05-11', kind: 'MEAL',
      title: 'Dinner', startsAt: '2030-05-11T18:30:00+02:00',
      mealType: 'DINNER', mealRestaurantId: 'la-reserve',
    }
    const unknownEvent: TripEvent = {
      id: 'unknown', dayId: 'day-2030-05-11', kind: 'MEAL',
      title: 'Dinner', startsAt: '2030-05-11T18:30:00+02:00',
      mealType: 'DINNER', mealRestaurantId: 'no-such-restaurant',
    }
    const highTeaEvent: TripEvent = {
      id: 'tea', dayId: 'day-2030-05-11', kind: 'MEAL',
      title: 'High Tea', startsAt: '2030-05-11T16:00:00+02:00',
      highTea: true,
    }
    expect(mealEventPresentation(data, legacyEvent)?.deck).toBeUndefined()
    expect(mealEventPresentation(data, unknownEvent)?.deck).toBeUndefined()
    expect(mealEventPresentation(data, highTeaEvent)?.deck).toBeUndefined()
  })
})
