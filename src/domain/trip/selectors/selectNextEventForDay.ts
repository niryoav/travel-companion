import type { TripEvent } from '../tripTypes'

export function selectNextEventForDay(
  events: TripEvent[],
  now = new Date(),
): TripEvent | null {
  const instant = now.getTime()

  return (
    events.find(
      ({ startsAt }) => startsAt && Date.parse(startsAt) > instant,
    ) ?? null
  )
}
