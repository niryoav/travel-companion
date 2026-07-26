import type { TripData, TripPhase } from '../tripTypes'
import { selectToday } from './selectToday'

export function resolveTripPhase(
  data: TripData,
  now = new Date(),
): TripPhase {
  const firstDay = data.days.at(0)
  const finalDay = data.days.at(-1)

  if (!firstDay || !finalDay) {
    return 'COMPLETED'
  }

  const instant = now.getTime()
  if (instant < Date.parse(firstDay.startsAt)) {
    return 'PRE_TRIP'
  }
  if (instant >= Date.parse(finalDay.endsAt)) {
    return 'COMPLETED'
  }

  return selectToday(data, now)?.kind ?? 'COMPLETED'
}
