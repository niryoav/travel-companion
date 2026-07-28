import type { TripData, TripDay } from '../tripTypes'
import { selectCurrentTripDay } from './selectCurrentTripDay'

export function selectToday(
  data: TripData,
  now = new Date(),
): TripDay | null {
  return selectCurrentTripDay(data, now)
}
