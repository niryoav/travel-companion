import type { TripEvent } from '../tripTypes'

export function selectNextEventForDay(
  events: TripEvent[],
  now = new Date(),
): TripEvent | null {
  const instant = now.getTime()

  return (
    events.find(
      ({ startsAt, operationalStatus }) =>
        operationalStatus !== 'CANCELLED' &&
        startsAt &&
        Date.parse(startsAt) > instant,
    ) ?? null
  )
}
