import type { TripData, TripEvent } from '../tripTypes'

export function selectNextEvent(
  data: TripData,
  now = new Date(),
): TripEvent | null {
  const instant = now.getTime()

  return (
    data.events
      .filter((event) => {
        if (!event.startsAt) {
          return false
        }
        const eventEnd = event.endsAt
          ? Date.parse(event.endsAt)
          : Date.parse(event.startsAt)
        return eventEnd >= instant
      })
      .sort(
        (left, right) =>
          Date.parse(left.startsAt ?? '') - Date.parse(right.startsAt ?? ''),
      )
      .at(0) ?? null
  )
}
