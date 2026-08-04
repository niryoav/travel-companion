import type { TripData, TripDay, TripEvent } from '../tripTypes.js'

export function selectDayEvents(
  data: TripData,
  day: TripDay | null,
): TripEvent[] {
  if (!day) {
    return []
  }

  const configuredOrder = new Map(
    day.eventIds.map((eventId, index) => [eventId, index]),
  )

  return day.eventIds
    .map((eventId) => data.events.find(({ id }) => id === eventId))
    .filter((event): event is TripEvent => Boolean(event))
    .sort((left, right) => {
      if (!left.startsAt && !right.startsAt) {
        return (
          (configuredOrder.get(left.id) ?? 0) -
          (configuredOrder.get(right.id) ?? 0)
        )
      }
      if (!left.startsAt) {
        return 1
      }
      if (!right.startsAt) {
        return -1
      }

      return (
        Date.parse(left.startsAt) -
          Date.parse(right.startsAt) ||
        (configuredOrder.get(left.id) ?? 0) -
          (configuredOrder.get(right.id) ?? 0)
      )
    })
}
