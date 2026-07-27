import type { PortCall, TripData, TripDay } from '../tripTypes'
import { selectDayPortCall } from './selectDayPortCall'

export function selectTodayPortCall(
  data: TripData,
  day: TripDay | null,
): PortCall | null {
  return selectDayPortCall(data, day)
}
