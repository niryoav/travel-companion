import type { TripData, TripDay } from '../tripTypes'
import { selectTripDays } from './selectTripDays'

export function selectCurrentTripDay(
  data: TripData,
  now = new Date(),
): TripDay | null {
  const instant = now.getTime()

  return (
    selectTripDays(data).find(
      ({ startsAt, endsAt }) =>
        Date.parse(startsAt) <= instant &&
        instant < Date.parse(endsAt),
    ) ?? null
  )
}
