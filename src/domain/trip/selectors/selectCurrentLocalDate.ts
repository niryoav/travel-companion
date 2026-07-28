import type { TripData } from '../tripTypes'
import { calendarDateInTimeZone } from '../tripTime'
import { selectToday } from './selectToday'

export function selectCurrentLocalDate(data: TripData, now: Date): string {
  const currentDay = selectToday(data, now)
  const timeZone = currentDay?.timeZone ?? data.trip.homeTimeZone

  return calendarDateInTimeZone(now, timeZone)
}
