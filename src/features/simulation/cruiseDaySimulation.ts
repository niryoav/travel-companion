import { selectTripDayByNumber } from '../../domain/trip/selectors/selectTripDayByNumber'
import type { TripData } from '../../domain/trip/tripTypes'

const CRUISE_DAY_SEARCH_PARAM = 'cruiseDay'

export function cruiseDayFromSearch(search: string): number | null {
  const raw = new URLSearchParams(search).get(CRUISE_DAY_SEARCH_PARAM)
  const value = raw ? Number(raw) : NaN
  return Number.isInteger(value) && value > 0 ? value : null
}

export function cruiseDaySearchParam(dayNumber: number): string {
  return `?${CRUISE_DAY_SEARCH_PARAM}=${dayNumber}`
}

/**
 * Resolves a `now` instant that falls inside the given canonical trip day,
 * so it can be handed to the same production selectors (e.g.
 * `selectTodayViewModel`) used for the live app. One hour past the day's
 * start keeps the instant safely inside the day's window.
 */
export function resolveCruiseDaySimulationDate(
  data: TripData,
  dayNumber: number,
): Date | null {
  const day = selectTripDayByNumber(data, dayNumber)
  if (!day) {
    return null
  }
  return new Date(Date.parse(day.startsAt) + 60 * 60 * 1000)
}
