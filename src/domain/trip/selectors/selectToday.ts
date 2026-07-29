import type { TripData, TripDay } from '../tripTypes.js'
import { selectCurrentTripDay } from './selectCurrentTripDay.js'

export function selectToday(
  data: TripData,
  now = new Date(),
): TripDay | null {
  return selectCurrentTripDay(data, now)
}
