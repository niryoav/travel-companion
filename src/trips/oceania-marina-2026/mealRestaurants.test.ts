import { describe, expect, it } from 'vitest'

import {
  availableMealRestaurants,
  availableOnboardMomentTypes,
  generateServiceTimes,
  isValidMealSelection,
  onboardMealDayContext,
  serviceWindowsForMeal,
} from '../../domain/trip/mealPlanning'
import type { MealRestaurant } from '../../domain/trip/tripTypes'
import { tripFixture } from '../../test/fixtures/tripFixture'
import { oceaniaMarina2026TripData } from './tripData'
import { oceaniaMarinaMealRestaurants } from './mealRestaurants'

const mealData = {
  ...tripFixture,
  mealRestaurants: [...oceaniaMarinaMealRestaurants],
}
const portDay = tripFixture.days.find(({ kind }) => kind === 'PORT_DAY')!
const seaDay = tripFixture.days.find(({ kind }) => kind === 'SEA_DAY')!

function ids(mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER', day = portDay) {
  return availableMealRestaurants(
    mealData,
    mealType,
    day,
  ).map(({ id }) => id)
}

describe('Oceania Marina meal restaurant catalog', () => {
  it('contains exactly the nine approved venues with canonical facts', () => {
    expect(oceaniaMarinaMealRestaurants).toHaveLength(9)
    expect(oceaniaMarinaMealRestaurants.map(({ id }) => id)).toEqual([
      'grand-dining-room',
      'terrace-cafe',
      'waves-grill',
      'aquamar-kitchen',
      'polo-grill',
      'toscana',
      'jacques',
      'red-ginger',
      'privee',
    ])
    expect(oceaniaMarinaMealRestaurants.map(({ name }) => name))
      .not.toContain('Baristas')
    expect(oceaniaMarinaMealRestaurants.map(({ name }) => name))
      .not.toContain('La Reserve')
    expect(
      Object.fromEntries(
        oceaniaMarinaMealRestaurants.map(({ name, location }) => [
          name,
          location,
        ]),
      ),
    ).toEqual({
      'The Grand Dining Room': 'Deck 6',
      'Terrace Café': 'Deck 12',
      'Waves Grill': 'Deck 12',
      'Aquamar Kitchen': 'Deck 12',
      'Polo Grill': 'Deck 14',
      Toscana: 'Deck 14',
      Jacques: 'Deck 5',
      'Red Ginger': 'Deck 5',
      Privée: 'Deck 14',
    })
    expect(
      Object.fromEntries(
        oceaniaMarinaMealRestaurants.map(({ name, deck }) => [name, deck]),
      ),
    ).toEqual({
      'The Grand Dining Room': 6,
      'Terrace Café': 12,
      'Waves Grill': 12,
      'Aquamar Kitchen': 12,
      'Polo Grill': 14,
      Toscana: 14,
      Jacques: 5,
      'Red Ginger': 5,
      Privée: 14,
    })
  })

  it('stores reservation, fee, and dinner-note facts canonically', () => {
    const required = oceaniaMarinaMealRestaurants
      .filter(({ reservationRequiredForDinner }) =>
        reservationRequiredForDinner)
      .map(({ id }) => id)
    expect(required).toEqual([
      'polo-grill',
      'toscana',
      'jacques',
      'red-ginger',
      'privee',
    ])
    expect(
      oceaniaMarinaMealRestaurants.find(({ id }) => id === 'privee'),
    ).toMatchObject({ extraFee: true })
    const waves = oceaniaMarinaMealRestaurants.find(
      ({ id }) => id === 'waves-grill',
    ) as MealRestaurant
    expect(waves.services.DINNER).toEqual([
      { opensAt: '18:30', closesAt: '21:00', note: 'Pizzeria' },
    ])
  })

  it('filters venues by meal and canonical port/sea day kind', () => {
    expect(ids('BREAKFAST')).toEqual([
      'grand-dining-room',
      'terrace-cafe',
      'waves-grill',
      'aquamar-kitchen',
    ])
    expect(ids('LUNCH', portDay)).toEqual([
      'terrace-cafe',
      'waves-grill',
      'aquamar-kitchen',
    ])
    expect(ids('LUNCH', seaDay)).toEqual([
      'grand-dining-room',
      'terrace-cafe',
      'waves-grill',
      'aquamar-kitchen',
    ])
    expect(ids('DINNER')).toEqual([
      'grand-dining-room',
      'terrace-cafe',
      'waves-grill',
      'polo-grill',
      'toscana',
      'jacques',
      'red-ginger',
      'privee',
    ])
  })

  it('selects Aquamar port and sea windows independently', () => {
    const aquamar = oceaniaMarinaMealRestaurants.find(
      ({ id }) => id === 'aquamar-kitchen',
    )!
    expect(serviceWindowsForMeal(
      mealData,
      aquamar,
      'BREAKFAST',
      portDay,
    )).toEqual([
      { opensAt: '07:00', closesAt: '10:00', dayType: 'PORT' },
    ])
    expect(serviceWindowsForMeal(
      mealData,
      aquamar,
      'BREAKFAST',
      seaDay,
    )).toEqual([
      { opensAt: '08:00', closesAt: '11:00', dayType: 'SEA' },
    ])
    expect(serviceWindowsForMeal(
      mealData,
      aquamar,
      'LUNCH',
      portDay,
    )).toEqual([
      { opensAt: '11:00', closesAt: '15:00', dayType: 'PORT' },
    ])
    expect(serviceWindowsForMeal(
      mealData,
      aquamar,
      'LUNCH',
      seaDay,
    )).toEqual([
      { opensAt: '12:00', closesAt: '16:00', dayType: 'SEA' },
    ])
  })

  it('generates inclusive 15-minute times and validates boundaries', () => {
    expect(
      generateServiceTimes([{ opensAt: '18:30', closesAt: '19:00' }]),
    ).toEqual(['18:30', '18:45', '19:00'])
    expect(
      isValidMealSelection(
        mealData,
        portDay,
        'DINNER',
        'toscana',
        '18:30',
      ),
    ).toBe(true)
    expect(
      isValidMealSelection(
        mealData,
        portDay,
        'DINNER',
        'toscana',
        '21:00',
      ),
    ).toBe(true)
    expect(
      isValidMealSelection(
        mealData,
        portDay,
        'DINNER',
        'toscana',
        '18:15',
      ),
    ).toBe(false)
    expect(
      isValidMealSelection(
        mealData,
        portDay,
        'DINNER',
        'toscana',
        '21:15',
      ),
    ).toBe(false)
  })

  it('disables every onboard moment before the canonical embarkation date', () => {
    const firstDay = oceaniaMarina2026TripData.days.find(
      ({ id }) => id === 'day-2026-08-22',
    )!

    expect(onboardMealDayContext(
      oceaniaMarina2026TripData,
      firstDay,
    )).toBeNull()
    expect(availableOnboardMomentTypes(
      oceaniaMarina2026TripData,
      firstDay,
    )).toEqual({ mealTypes: [], highTea: false })
    for (const mealType of ['BREAKFAST', 'LUNCH', 'DINNER'] as const) {
      expect(availableMealRestaurants(
        oceaniaMarina2026TripData,
        mealType,
        firstDay,
      )).toEqual([])
    }
  })

  it('offers only supported generic Breakfast windows on disembarkation day', () => {
    const finalDay = oceaniaMarina2026TripData.days.find(
      ({ id }) => id === 'day-2026-09-04',
    )!

    expect(onboardMealDayContext(
      oceaniaMarina2026TripData,
      finalDay,
    )).toBe('DISEMBARKATION')
    expect(availableOnboardMomentTypes(
      oceaniaMarina2026TripData,
      finalDay,
    )).toEqual({ mealTypes: ['BREAKFAST'], highTea: false })
    const breakfastRestaurants = availableMealRestaurants(
      oceaniaMarina2026TripData,
      'BREAKFAST',
      finalDay,
    )
    expect(breakfastRestaurants.map(({ id }) => id)).toEqual([
      'grand-dining-room',
      'terrace-cafe',
      'waves-grill',
    ])
    expect(Object.fromEntries(
      breakfastRestaurants.map((restaurant) => [
        restaurant.id,
        serviceWindowsForMeal(
          oceaniaMarina2026TripData,
          restaurant,
          'BREAKFAST',
          finalDay,
        ),
      ]),
    )).toEqual({
      'grand-dining-room': [{ opensAt: '08:00', closesAt: '09:30' }],
      'terrace-cafe': [{ opensAt: '07:30', closesAt: '10:00' }],
      'waves-grill': [{ opensAt: '07:00', closesAt: '11:00' }],
    })
    expect(availableMealRestaurants(
      oceaniaMarina2026TripData,
      'LUNCH',
      finalDay,
    )).toEqual([])
    expect(availableMealRestaurants(
      oceaniaMarina2026TripData,
      'DINNER',
      finalDay,
    )).toEqual([])
  })
})
