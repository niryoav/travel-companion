import { instantFromLocalTime } from '../../../domain/trip/localTimeInput.js'
import { calendarDateInTimeZone } from '../../../domain/trip/tripTime.js'
import type { TripData } from '../../../domain/trip/tripTypes.js'
import type { TripReminder } from '../reminderTypes.js'
import { selectCruiseWindow } from './selectCruiseWindow.js'

export const DAILY_TEST_LOCAL_TIME = '10:00'

/**
 * A temporary, pre-trip-only reminder that proves the GitHub Actions → Vercel
 * → Web Push → device chain still works, once a day, while the PWA is
 * already installed on both phones but the cruise hasn't started yet. Not
 * part of selectTripReminders(data) because it depends on `now` (today's
 * local date), not trip content — and it disables itself automatically the
 * moment the real cruise window begins, so it never fires during or after
 * the trip.
 */
export function selectDailyTestReminder(
  data: TripData,
  now: Date,
): TripReminder | null {
  const cruiseWindow = selectCruiseWindow(data)
  if (!cruiseWindow) {
    return null
  }

  const timeZone = data.trip.homeTimeZone
  const localDate = calendarDateInTimeZone(now, timeZone)
  const triggerAt = instantFromLocalTime(
    localDate,
    DAILY_TEST_LOCAL_TIME,
    timeZone,
  )
  if (!triggerAt || Date.parse(triggerAt) >= Date.parse(cruiseWindow.startAt)) {
    return null
  }

  return {
    id: `${data.trip.id}:daily-test:${localDate}`,
    tripId: data.trip.id,
    sourceEntityId: localDate,
    kind: 'daily-test',
    triggerAt,
    timeZone,
    title: 'Travel Companion test',
    body: 'Dit is de dagelijkse testmelding. Reismeldingen werken op dit toestel.',
    targetPath: '/more',
    status: 'confirmed',
  }
}
