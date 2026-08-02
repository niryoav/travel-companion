import type { TripData, TripDay } from '../tripTypes.js'
import { selectTripDays } from './selectTripDays.js'

export function selectTripDayByNumber(
  data: TripData,
  dayNumber: number,
): TripDay | null {
  return selectTripDays(data)[dayNumber - 1] ?? null
}
