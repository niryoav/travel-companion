import { selectCurrentLocalDate } from '../domain/trip/selectors/selectCurrentLocalDate'
import type { TripData } from '../domain/trip/tripTypes'

export type StartupPath = '/home' | '/today' | '/welcome'

export function selectStartupPath(data: TripData, now: Date): StartupPath {
  const localDate = selectCurrentLocalDate(data, now)
  if (localDate < data.trip.startDate) {
    return '/welcome'
  }

  const isActiveTripDate =
    localDate <= data.trip.endDate

  return isActiveTripDate ? '/today' : '/home'
}
