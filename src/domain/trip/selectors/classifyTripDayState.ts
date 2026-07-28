import type { TripDay } from '../tripTypes'

export type TripDayState = 'PAST' | 'TODAY' | 'UPCOMING'

export function classifyTripDayState(
  day: TripDay,
  now = new Date(),
): TripDayState {
  const instant = now.getTime()

  if (instant < Date.parse(day.startsAt)) {
    return 'UPCOMING'
  }
  if (instant >= Date.parse(day.endsAt)) {
    return 'PAST'
  }
  return 'TODAY'
}
