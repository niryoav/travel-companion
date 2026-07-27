import type { TripData, TripDay, TripEvent } from '../tripTypes'
import { selectDayEvents } from './selectDayEvents'

export function selectTodayEvents(
  data: TripData,
  day: TripDay | null,
): TripEvent[] {
  return selectDayEvents(data, day)
}
