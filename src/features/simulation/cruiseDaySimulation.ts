import { instantFromLocalTime } from '../../domain/trip/localTimeInput'
import { selectTripDayByNumber } from '../../domain/trip/selectors/selectTripDayByNumber'
import type { TripData } from '../../domain/trip/tripTypes'

const CRUISE_DAY_SEARCH_PARAM = 'cruiseDay'
const CRUISE_TIME_SEARCH_PARAM = 'cruiseTime'
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

export function cruiseDayFromSearch(search: string): number | null {
  const raw = new URLSearchParams(search).get(CRUISE_DAY_SEARCH_PARAM)
  const value = raw ? Number(raw) : NaN
  return Number.isInteger(value) && value > 0 ? value : null
}

export function cruiseDaySearchParam(dayNumber: number): string {
  return `?${CRUISE_DAY_SEARCH_PARAM}=${dayNumber}`
}

/**
 * Reads `?cruiseTime=HH:MM` — an optional companion to `?cruiseDay=N` that
 * previews a specific local clock time on that trip day (e.g. evening
 * "Prepare for tomorrow" at 18:05, or the following morning at 07:30)
 * instead of the default "1 hour after the day starts".
 */
export function cruiseTimeFromSearch(search: string): string | null {
  const raw = new URLSearchParams(search).get(CRUISE_TIME_SEARCH_PARAM)
  return raw && TIME_PATTERN.test(raw) ? raw : null
}

export function cruiseTimeSearchParam(time: string): string {
  return `${CRUISE_TIME_SEARCH_PARAM}=${time}`
}

/**
 * Resolves a `now` instant that falls inside the given canonical trip day,
 * so it can be handed to the same production selectors (e.g.
 * `selectTodayViewModel`) used for the live app. Without a `timeOverride`,
 * one hour past the day's start keeps the instant safely inside the day's
 * window. With a `timeOverride` (`HH:MM`), the instant is that local clock
 * time on the day, in the day's own timezone — not the device's.
 */
export function resolveCruiseDaySimulationDate(
  data: TripData,
  dayNumber: number,
  timeOverride?: string | null,
): Date | null {
  const day = selectTripDayByNumber(data, dayNumber)
  if (!day) {
    return null
  }
  if (timeOverride) {
    const instant = instantFromLocalTime(
      day.localDate,
      timeOverride,
      day.timeZone,
    )
    if (instant) {
      return new Date(instant)
    }
  }
  return new Date(Date.parse(day.startsAt) + 60 * 60 * 1000)
}
