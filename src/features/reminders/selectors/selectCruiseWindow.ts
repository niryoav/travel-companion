import { instantFromLocalTime } from '../../../domain/trip/localTimeInput.js'
import { addCalendarDays } from '../../../domain/trip/tripTime.js'
import type { TripData } from '../../../domain/trip/tripTypes.js'

// The window in which real travel reminders are allowed to send.
//
// The END is "arrival afternoon" rather than the exact last event time, so
// a stray bad date in trip data can't cause a push at 3am.
//
// The START is deliberately NOT trip.startDate itself — it's one calendar
// day earlier, in the evening, so the very first "Prepare for tomorrow"
// reminder (18:00 the evening before departure day) is still inside the
// window. This is a notification-scheduling decision only: it does not
// change trip.startDate, which remains the canonical departure date used
// everywhere else in the app (itinerary, day generation, etc).
//
// Both boundaries are interpreted in the trip's home timezone, since
// they're home-departure/home-return boundaries, not port-local times.
export const NOTIFICATION_WINDOW_START_LEAD_DAYS = 1
export const NOTIFICATION_WINDOW_START_LOCAL_TIME = '17:45'
export const CRUISE_WINDOW_END_LOCAL_TIME = '16:00'

export interface CruiseWindow {
  startAt: string
  endAt: string
}

export function selectCruiseWindow(data: TripData): CruiseWindow | null {
  const timeZone = data.trip.homeTimeZone
  const notificationWindowStartDate = addCalendarDays(
    data.trip.startDate,
    -NOTIFICATION_WINDOW_START_LEAD_DAYS,
  )
  const startAt = notificationWindowStartDate
    ? instantFromLocalTime(
        notificationWindowStartDate,
        NOTIFICATION_WINDOW_START_LOCAL_TIME,
        timeZone,
      )
    : null
  const endAt = instantFromLocalTime(
    data.trip.endDate,
    CRUISE_WINDOW_END_LOCAL_TIME,
    timeZone,
  )
  if (!startAt || !endAt) {
    return null
  }
  return { startAt, endAt }
}
