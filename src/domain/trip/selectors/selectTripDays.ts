import type { TripData, TripDay } from '../tripTypes.js'

export function selectTripDays(data: TripData): TripDay[] {
  return data.trip.dayIds
    .map((dayId) => data.days.find(({ id }) => id === dayId))
    .filter((day): day is TripDay => Boolean(day))
    .sort(
      (left, right) =>
        Date.parse(left.startsAt) - Date.parse(right.startsAt),
    )
}
