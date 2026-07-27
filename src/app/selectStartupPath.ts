import { selectCurrentLocalDate } from '../domain/trip/selectors/selectCurrentLocalDate'
import type { TripData } from '../domain/trip/tripTypes'

export type StartupPath = '/home' | '/today'

export function selectStartupPath(data: TripData, now: Date): StartupPath {
  const localDate = selectCurrentLocalDate(data, now)
  const isActiveTripDate =
    localDate >= data.trip.startDate && localDate <= data.trip.endDate

  return isActiveTripDate ? '/today' : '/home'
}
