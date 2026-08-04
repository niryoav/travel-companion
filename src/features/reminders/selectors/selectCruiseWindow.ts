import { instantFromLocalTime } from '../../../domain/trip/localTimeInput.js'
import type { TripData } from '../../../domain/trip/tripTypes.js'

// The window in which real travel reminders are allowed to send — chosen
// as "departure morning" to "arrival afternoon" rather than the exact
// first/last event times, so a stray bad date in trip data can't cause a
// push at 3am. Interpreted in the trip's home timezone, since these are
// home-departure/home-return boundaries, not port-local times.
export const CRUISE_WINDOW_START_LOCAL_TIME = '09:00'
export const CRUISE_WINDOW_END_LOCAL_TIME = '16:00'

export interface CruiseWindow {
  startAt: string
  endAt: string
}

export function selectCruiseWindow(data: TripData): CruiseWindow | null {
  const timeZone = data.trip.homeTimeZone
  const startAt = instantFromLocalTime(
    data.trip.startDate,
    CRUISE_WINDOW_START_LOCAL_TIME,
    timeZone,
  )
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
