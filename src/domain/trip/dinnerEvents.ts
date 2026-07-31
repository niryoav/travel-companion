import type { TripData, TripEvent } from './tripTypes'

export function dinnerEventPresentation(
  data: TripData,
  event: TripEvent,
) {
  if (!event.dinnerRestaurantId) {
    return null
  }
  const restaurant = data.dinnerRestaurants?.find(
    ({ id }) => id === event.dinnerRestaurantId,
  )
  if (!restaurant) {
    return null
  }
  return {
    title: restaurant.name,
    location: restaurant.location,
    labels: [
      ...(restaurant.reservationRequired ? ['Reservation'] : []),
      ...(restaurant.extraFee ? ['Extra fee'] : []),
    ],
  }
}
