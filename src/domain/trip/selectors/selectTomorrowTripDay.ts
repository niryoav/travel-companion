import type { TripData, TripDay } from '../tripTypes'

/**
 * The trip day immediately after `today`, in canonical day order — or
 * `undefined` on the final day of the trip. Shared by every feature that
 * needs "tomorrow" (Home's evening card, the dedicated preparation
 * screen, Today's own preparation view) so they agree on exactly which
 * day that is.
 */
export function selectTomorrowTripDay(
  data: TripData,
  today: TripDay,
): TripDay | undefined {
  const todayIndex = data.days.findIndex(({ id }) => id === today.id)
  return data.days[todayIndex + 1]
}
