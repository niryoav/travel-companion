import type { TripEvent } from '../tripTypes'

export function selectCurrentEvent(
  events: TripEvent[],
  now = new Date(),
): TripEvent | null {
  const instant = now.getTime()

  // Overlaps are valid. The first event in the caller's configured ordering
  // remains the primary current event while presentation may mark all active
  // ranges as current.
  return (
    events.find(
      ({ startsAt, endsAt }) =>
        startsAt &&
        endsAt &&
        Date.parse(startsAt) <= instant &&
        instant < Date.parse(endsAt),
    ) ?? null
  )
}
