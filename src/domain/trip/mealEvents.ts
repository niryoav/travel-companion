import { serviceWindowsForMeal } from './mealPlanning.js'
import type { TripData, TripEvent } from './tripTypes.js'

function mealTypeLabel(value: 'BREAKFAST' | 'LUNCH' | 'DINNER'): string {
  return value.charAt(0) + value.slice(1).toLowerCase()
}

export function mealEventPresentation(
  data: TripData,
  event: TripEvent,
) {
  if (event.highTea) {
    return {
      kindLabel: 'High Tea',
      title: 'High Tea',
      location: 'Horizons Lounge · Deck 15',
      labels: [] as string[],
    }
  }
  if (!event.mealType || !event.mealRestaurantId) {
    return null
  }
  const restaurant = data.mealRestaurants?.find(
    ({ id }) => id === event.mealRestaurantId,
  )
  if (!restaurant) {
    return event.mealRestaurantId === 'la-reserve'
      ? {
          kindLabel: 'Dinner',
          title: 'La Reserve',
          location: 'Legacy venue · location unavailable',
          labels: ['Legacy venue'],
        }
      : {
          kindLabel: mealTypeLabel(event.mealType),
          title: 'Unknown venue',
          location: 'Venue unavailable',
          labels: ['Legacy venue'],
        }
  }
  const day = data.days.find(({ id }) => id === event.dayId)
  const serviceNotes = day
    ? serviceWindowsForMeal(data, restaurant, event.mealType, day)
        .flatMap(({ note }) => note ? [note] : [])
    : []
  return {
    kindLabel: mealTypeLabel(event.mealType),
    title: restaurant.name,
    location: restaurant.location,
    labels: [
      ...(
        event.mealType === 'DINNER' &&
        restaurant.reservationRequiredForDinner
          ? ['Reservation required']
          : []
      ),
      ...(restaurant.extraFee ? ['Extra fee'] : []),
      ...serviceNotes.filter((note) => note === 'Pizzeria'),
    ],
  }
}
