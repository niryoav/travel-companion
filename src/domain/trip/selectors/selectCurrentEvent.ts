import type { TripEvent } from '../tripTypes'

export function selectCurrentEvent(
  events: TripEvent[],
  now = new Date(),
): TripEvent | null {
  const instant = now.getTime()

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

